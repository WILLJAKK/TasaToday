import { drizzle } from "drizzle-orm/netlify-db";
import { getTableName } from "drizzle-orm";
import fs from "fs";
import path from "path";
import * as schema from "./schema.js";

let realDb: any = null;

function getRealDb() {
  if (!realDb && process.env.NETLIFY_DB_URL) {
    try {
      realDb = drizzle({ schema });
    } catch (err) {
      console.warn("[DB] No se pudo inicializar Netlify DB con NETLIFY_DB_URL:", err);
    }
  }
  return realDb;
}

// Persistencia en archivo / memoria para desarrollo local / preview cuando NETLIFY_DB_URL no está configurada
function getFilePath(tableName: string) {
  if (tableName === 'native_push_tokens') {
    return path.join(process.cwd(), 'native_device_tokens.json');
  }
  return path.join(process.cwd(), 'push_subscriptions.json');
}

function readLocalTable(tableName: string): any[] {
  try {
    const file = getFilePath(tableName);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(data)) {
        return data.map((item, idx) => ({
          id: item.id || idx + 1,
          endpoint: item.endpoint,
          p256dh: item.keys?.p256dh || item.p256dh,
          auth: item.keys?.auth || item.auth,
          token: item.token,
          platform: item.platform,
          createdAt: item.createdAt || new Date(),
        }));
      }
    }
  } catch {}
  return [];
}

function writeLocalTable(tableName: string, data: any[]) {
  try {
    const file = getFilePath(tableName);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[DB Local] Error guardando datos locales:', err);
  }
}

function extractCondition(condition: any): { column?: string; value?: any } {
  if (!condition) return {};
  if (Array.isArray(condition.queryChunks)) {
    let col = '';
    let val: any = undefined;
    for (const chunk of condition.queryChunks) {
      if (chunk && typeof chunk === 'object') {
        if ('name' in chunk && typeof chunk.name === 'string' && 'table' in chunk) {
          col = chunk.name;
        } else if ('value' in chunk && ('encoder' in chunk || chunk.constructor?.name === 'Param')) {
          val = chunk.value;
        }
      }
    }
    return { column: col, value: val };
  }
  return {};
}

const fallbackDb = {
  select: () => ({
    from: async (table: any) => {
      const tableName = getTableName(table);
      return readLocalTable(tableName);
    },
  }),
  insert: (table: any) => ({
    values: (valueOrValues: any) => {
      const tableName = getTableName(table);
      const executeInsert = async () => {
        const rows = readLocalTable(tableName);
        const toAdd = Array.isArray(valueOrValues) ? valueOrValues : [valueOrValues];
        for (const item of toAdd) {
          const key = item.endpoint || item.token;
          const exists = rows.some((r) => (r.endpoint && r.endpoint === key) || (r.token && r.token === key));
          if (!exists) {
            rows.push({
              id: rows.length + 1,
              ...item,
              createdAt: item.createdAt || new Date(),
            });
          }
        }
        writeLocalTable(tableName, rows);
        return rows;
      };

      return {
        onConflictDoNothing: async () => executeInsert(),
        then: (onfulfilled?: any, onrejected?: any) => executeInsert().then(onfulfilled, onrejected),
      };
    },
  }),
  delete: (table: any) => ({
    where: async (condition: any) => {
      const tableName = getTableName(table);
      const rows = readLocalTable(tableName);
      const { column, value } = extractCondition(condition);
      const filtered = column && value !== undefined
        ? rows.filter((r) => r[column] !== value)
        : rows;
      writeLocalTable(tableName, filtered);
      return filtered;
    },
  }),
};

export const db: any = new Proxy({}, {
  get(target, prop, receiver) {
    const real = getRealDb();
    if (real && typeof real[prop] !== 'undefined') {
      const val = real[prop];
      return typeof val === 'function' ? val.bind(real) : val;
    }
    return (fallbackDb as any)[prop];
  },
});

