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
  if (typeof mod === 'function') {
    const baseName = path.basename(fileName, '.js').toLowerCase();
    return {
      commands: [baseName, ...(baseName === 'help' ? ['menu'] : []), ...(baseName === 'delete' ? ['del'] : [])],
      run: mod,
      _sourceFile: fileName,
      _sourcePath: filePath,
    };
  }

  if (mod && typeof mod === 'object') {
    if (mod.default && typeof mod.default === 'function') {
      return normalizePluginModule(mod.default, filePath, fileName);
    }

    if (Array.isArray(mod.commands) && (typeof mod.run === 'function' || typeof mod.exec === 'function')) {
      return { ...mod, run: mod.run || mod.exec, _sourceFile: fileName, _sourcePath: filePath };
    }

    if (typeof mod.run === 'function' || typeof mod.exec === 'function') {
      const baseName = path.basename(fileName, '.js').toLowerCase();
      const commands = Array.isArray(mod.commands)
        ? mod.commands.filter(Boolean)
        : typeof mod.commands === 'string' && mod.commands
          ? [mod.commands]
          : [baseName];
      return {
        commands,
        run: mod.run || mod.exec,
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
  resetCache,
};
