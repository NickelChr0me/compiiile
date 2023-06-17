#! /usr/bin/env node

const { createServer, build, preview } = require('vite');
const fs = require('fs');

const path = require('path');
const { config } = require('./client/config');
const dns = require('dns');

const source = process.cwd();
const DEST_FOLDER = '.compiiile';
const CONFIG_FILE = 'compiiile.config.js';

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const devCommandDescription = 'lancer le serveur de développement';

// Cela nous permet de servir par défaut sur localhost au lieu de 127.0.0.1
dns.setDefaultResultOrder('verbatim');

/*
 Ordre des options par priorité :
 1. arguments de la commande
 2. configuration définie par l'utilisateur dans un fichier dédié
 3. configuration par défaut en dernier recours
 */
const argv = yargs(hideBin(process.argv))
  .parserConfiguration({
    'deep-merge-config': true,
  })
  .config({
    extends: path.join(source, CONFIG_FILE),
  })
  .config({
    dest: `${DEST_FOLDER}/dist`,
  })
  .command('dev', devCommandDescription)
  .command('build', 'construction')
  .command('preview', 'aperçu')
  .help().argv;

const IS_DEV = argv._.length === 0 || argv._.includes('dev');
const IS_BUILD = argv._.includes('build');
const IS_PREVIEW = argv._.includes('preview');

(async () => {
  process.env.COMPIIILE_SOURCE = source;

  const viteConfig = {
    configFile: path.resolve(__dirname, 'client/vite.config.js'),
    root: path.resolve(__dirname, 'client'),
    server: {
      port: 3000,
      host: 'localhost',
    },

    build: {
      outDir: path.join(source, argv.dest),
      emptyOutDir: true,
    },

    preview: {
      port: 8080,
      open: true,
    },
  };

  process.env.VITE_COMPIIILE_SITE_URL = argv.siteUrl ?? '';

  process.env.VITE_COMPIIILE_TITLE = argv.title ?? '';
  process.env.VITE_COMPIIILE_DESCRIPTION = argv.description ?? '';

  // Gestion du logo et de l'icône
  process.env.VITE_COMPIIILE_LOGO = argv.logo ?? undefined;

  if (argv.logo) {
    try {
      fs.copyFileSync(
        path.resolve(source, argv.logo),
        path.resolve(__dirname, './client/public/favicon.png')
      );
      // Définir le logo à afficher dans la barre supérieure si nous avons réussi à le copier
      process.env.VITE_COMPIIILE_LOGO = argv.logo;
    } catch (e) {
      console.log(e);
      console.error(
        "Impossible de charger le logo fourni : veuillez spécifier une URL relative à partir du dossier courant"
      );
    }
  } else {
    // Utiliser l'icône par défaut si aucun logo n'est fourni
    fs.copyFileSync(
      path.resolve(__dirname, './client/src/assets/logo.png'),
      path.resolve(__dirname, './client/public/favicon.png')
    );
  }

  if (IS_DEV) {
    process.env.NODE_ENV = 'development';

    const server = await createServer(viteConfig);

    await server.listen();

    server.printUrls();
  } else if (IS_BUILD) {
    process.env.NODE_ENV = 'production';

    const publicImagesDirectory = path.resolve(
      __dirname,
      `./client/public/${config.publicImagesDirectoryName}`
    );
    if (fs.existsSync(publicImagesDirectory)) {
      fs.readdirSync(publicImagesDirectory).forEach((f) =>
      fs.rmSync(`${publicImagesDirectory}/${f}`)
    );    
    } else {
      fs.mkdirSync(publicImagesDirectory);
    }

    await build(viteConfig);
  } else if (IS_PREVIEW) {
    process.env.NODE_ENV = 'production';

    await preview(viteConfig);
  }
})();