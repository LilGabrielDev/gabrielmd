const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, 'commands');

// Cache
let _pluginMap = null;
let _allPlugins = null;

function walkPluginFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkPluginFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizePluginModule(mod, filePath, fileName) {
  const baseName = path.basename(fileName, '.js').toLowerCase();

  // If mod is a function, wrap it so it works cleanly whether expecting
  // (sock, chatId, message, q, args, ctx) OR (sock, message, args, ctx)
  if (typeof mod === 'function') {
    const runWrapper = async (sock, message, args, ctx) => {
      if (message && typeof message === 'object' && (message.key || message.message)) {
        const chatId = ctx?.chatId || ctx?.jid || message.key?.remoteJid;
        const q = Array.isArray(args) ? args.join(' ') : (typeof args === 'string' ? args : '');
        return await mod(sock, chatId, message, q, args, ctx);
      }
      return await mod(sock, message, args, ctx);
    };

    return {
      commands: [
        baseName,
        ...(baseName === 'help' ? ['menu', 'helpmenu'] : []),
        ...(baseName === 'delete' ? ['del'] : []),
        ...(baseName === 'sticker' ? ['s', 'stick'] : []),
        ...(baseName === 'sticker-alt' ? ['sticker2', 'salt'] : []),
      ],
      run: runWrapper,
      _sourceFile: fileName,
      _sourcePath: filePath,
    };
  }

  if (mod && typeof mod === 'object') {
    if (mod.default && typeof mod.default === 'function') {
      return normalizePluginModule(mod.default, filePath, fileName);
    }

    let runFn = mod.run || mod.exec;

    // If not direct run/exec, check for named function like xxxCommand, handleXxxCommand, etc.
    if (!runFn) {
      for (const key of Object.keys(mod)) {
        if (typeof mod[key] === 'function' && (
          key.toLowerCase().includes(baseName) ||
          key.toLowerCase().endsWith('command') ||
          key.toLowerCase().startsWith('handle')
        )) {
          runFn = mod[key];
          break;
        }
      }
    }

    if (typeof runFn === 'function') {
      let commands = [];
      if (Array.isArray(mod.commands)) {
        commands = mod.commands.filter(Boolean);
      } else if (typeof mod.commands === 'string' && mod.commands) {
        commands = [mod.commands];
      }
      if (!commands.length) {
        commands = [baseName];
      }
      if (Array.isArray(mod.alias)) commands.push(...mod.alias);
      if (Array.isArray(mod.aliases)) commands.push(...mod.aliases);
      if (typeof mod.alias === 'string') commands.push(mod.alias);

      const runWrapper = async (sock, message, args, ctx) => {
        // If runFn has legacy signature (sock, chatId, message, q, args)
        if (runFn.length >= 3 && runFn.length <= 5 && !mod.commands) {
          const chatId = ctx?.chatId || ctx?.jid || message?.key?.remoteJid;
          const q = Array.isArray(args) ? args.join(' ') : (typeof args === 'string' ? args : '');
          return await runFn(sock, chatId, message, q, args, ctx);
        }
        return await runFn(sock, message, args, ctx);
      };

      return {
        ...mod,
        commands: [...new Set(commands.map(c => String(c).toLowerCase().trim()))],
        run: runWrapper,
        _sourceFile: fileName,
        _sourcePath: filePath,
      };
    }
  }

  return null;
}

function loadAllPlugins() {
  if (_allPlugins) return _allPlugins;

  const plugins = [];
  const files = walkPluginFiles(PLUGINS_DIR);

  for (const filePath of files) {
    const resolvedPath = path.resolve(filePath);
    const fileName = path.basename(filePath);
    try {
      delete require.cache[resolvedPath];
      const mod = require(resolvedPath);
      const plugin = normalizePluginModule(mod, resolvedPath, fileName);
      if (plugin) {
        plugins.push(plugin);
      }
    } catch (e) {
      console.error(`[handler] Skipping ${fileName}: ${e.message}`);
    }
  }

  _allPlugins = plugins;
  return plugins;
}

function buildPluginMap() {
  if (_pluginMap) return _pluginMap;

  const plugins = loadAllPlugins();
  const map = new Map();

  for (const plugin of plugins) {
    const commands = Array.isArray(plugin.commands) ? plugin.commands : [plugin.commands].filter(Boolean);
    for (const cmd of commands) {
      const key = String(cmd).toLowerCase().replace(/^\./, '');
      if (!map.has(key)) {
        map.set(key, plugin);
      }
    }
  }

  _pluginMap = map;
  return map;
}

function getPlugin(commandName) {
  const map = buildPluginMap();
  const key = commandName.toLowerCase().replace(/^\./, '');
  return map.get(key) || null;
}

function getAllPlugins() {
  return loadAllPlugins();
}

function getPluginCount() {
  return buildPluginMap().size;
}

function resetCache() {
  _pluginMap = null;
  _allPlugins = null;
}

module.exports = {
  loadAllPlugins,
  buildPluginMap,
  getPlugin,
  getAllPlugins,
  getPluginCount,
  normalizePluginModule,
  resetCache,
};
