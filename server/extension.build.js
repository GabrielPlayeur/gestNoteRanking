#!/usr/bin/env node

/**
 * Build and minification script for the GestNote Ranking extension
 * Minifies all JavaScript files and creates a ZIP package
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

// Configuration
const config = {
    extensionDir: '../extension',
    buildDir: '../build',
    outputDir: '../dist',
    outputName: 'extensions.zip',
    cleanBuild: true
};

// Colors for logs
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function log(message, color = colors.white) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, colors.green);
}

function logError(message) {
    log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
    log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
    log(`ℹ️  ${message}`, colors.blue);
}

// Check if Terser is available
function checkTerser() {
    try {
        execSync('npx terser --version', { stdio: 'ignore' });
        return true;
    } catch (error) {
        return false;
    }
}

// Install Terser if needed
function installTerser() {
    logInfo('Installing Terser...');
    try {
        execSync('npm install terser', { stdio: 'inherit' });
        logSuccess('Terser installed successfully');
        return true;
    } catch (error) {
        logError('Error while installing Terser');
        return false;
    }
}

// Create required directories
function createDirectories() {
    logInfo('Creating directories...');

    if (config.cleanBuild && fs.existsSync(config.buildDir)) {
        fs.rmSync(config.buildDir, { recursive: true, force: true });
        log('  🧹 Build directory cleaned', colors.yellow);
    }

    if (!fs.existsSync(config.buildDir)) {
        fs.mkdirSync(config.buildDir, { recursive: true });
        log(`  📁 Created: ${config.buildDir}`, colors.cyan);
    }

    if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
        log(`  📁 Created: ${config.outputDir}`, colors.cyan);
    }

    logSuccess('Directories created');
}

// Copy non-JavaScript files and update popup.html script reference
function copyNonJsFiles() {
    logInfo('Copying non-JavaScript files...');
    const files = fs.readdirSync(config.extensionDir);
    let copiedCount = 0;
    files.forEach(file => {
        const filePath = path.join(config.extensionDir, file);
        const stat = fs.statSync(filePath);
        const destPath = path.join(config.buildDir, file);
        if (stat.isFile() && (!file.endsWith('.js') || file.endsWith('.min.js'))) {
            if (file === 'popup.html') {
                // Read, replace script src, and write
                let html = fs.readFileSync(filePath, 'utf8');
                html = html.replace(/<script\s+src=["']popup\.js["']><\/script>/, '<script src="popup.min.js"></script>');
                fs.writeFileSync(destPath, html, 'utf8');
                log(`  ✓ Copied and updated: ${file}`, colors.white);
            } else {
                fs.copyFileSync(filePath, destPath);
                log(`  ✓ Copied: ${file}`, colors.white);
            }
            copiedCount++;
        }
    });
    logSuccess(`${copiedCount} non-JS files copied`);
}

// Minify a JavaScript file
function minifyJsFile(inputPath, outputPath) {
    const fileName = path.basename(inputPath);
    const baseName = path.basename(inputPath, '.js');
    const tempPath = inputPath + '.iife-tmp';
    try {
        // Wrap in IIFE to avoid global scope collisions
        let originalCode = fs.readFileSync(inputPath, 'utf8');
        if (fileName === 'histogram.js') {
            originalCode += '\nwindow.showHistogram = showHistogram;\nwindow.hideHistogram = hideHistogram;\nwindow.graphContainer = graphContainer;\nwindow.globalBridge = globalBridge;';
        }
        const wrappedCode = `(function(){\n${originalCode}\n})();`;
        fs.writeFileSync(tempPath, wrappedCode, 'utf8');

        // Minification options
        const options = [
            '--compress', 'drop_console=false,drop_debugger=true,pure_funcs=["console.log"]',
            '--mangle', 'toplevel=true,reserved=["chrome","browser","manifest","d3"]',
            '--format', 'ascii_only=true,beautify=false',
            // '--module' // Do not use --module with IIFE
        ];
        const command = `npx terser "${tempPath}" ${options.join(' ')} --output "${outputPath}"`;
        execSync(command, { stdio: 'pipe' });
        fs.unlinkSync(tempPath);
        // Calculate size reduction
        const originalSize = originalCode.length;
        const minifiedSize = fs.statSync(outputPath).size;
        const reduction = Math.round(((originalSize - minifiedSize) / originalSize) * 100 * 10) / 10;
        log(`    ✅ ${fileName} -> ${baseName}.min.js (${reduction}% reduction)`, colors.green);
        return true;
    } catch (error) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        logWarning(`Error while minifying ${fileName}: ${error.message}`);
        // Copy original file in case of error
        fs.copyFileSync(inputPath, outputPath);
        log(`    ⚠️  Original file copied: ${baseName}.min.js`, colors.yellow);
        return false;
    }
}

// Minify all JavaScript files
function minifyJsFiles() {
    logInfo('Minifying JavaScript files...');

    const files = fs.readdirSync(config.extensionDir);
    const jsFiles = files.filter(file => (file.endsWith('.js') && !file.endsWith('.min.js')));
    let successCount = 0;

    jsFiles.forEach(file => {
        const inputPath = path.join(config.extensionDir, file);
        const baseName = path.basename(file, '.js');
        const outputPath = path.join(config.buildDir, `${baseName}.min.js`);

        log(`  🔄 Minifying: ${file}`, colors.yellow);

        if (minifyJsFile(inputPath, outputPath)) {
            successCount++;
        }
    });
    logSuccess(`${successCount}/${jsFiles.length} JS files minified successfully`);
}

// Update manifest.json
function updateManifest() {
    logInfo('Updating manifest.json...');

    const manifestPath = path.join(config.buildDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
        logWarning('manifest.json not found');
        return;
    }

    try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);
        let changesCount = 0;

        // Update content_scripts
        if (manifest.content_scripts) {
            manifest.content_scripts.forEach(contentScript => {
                if (contentScript.js) {
                    contentScript.js = contentScript.js.map(jsFile => {
                        if (jsFile.endsWith('.js') && !jsFile.endsWith('.min.js')) {
                            const baseName = path.basename(jsFile, '.js');
                            const newFile = `${baseName}.min.js`;
                            log(`    ✓ ${jsFile} -> ${newFile}`, colors.white);
                            changesCount++;
                            return newFile;
                        }
                        return jsFile;
                    });
                }
            });
        }

        // Update background scripts
        if (manifest.background && manifest.background.scripts) {
            manifest.background.scripts = manifest.background.scripts.map(jsFile => {
                if (jsFile.endsWith('.js') && !jsFile.endsWith('.min.js')) {
                    const baseName = path.basename(jsFile, '.js');
                    const newFile = `${baseName}.min.js`;
                    log(`    ✓ Background: ${jsFile} -> ${newFile}`, colors.white);
                    changesCount++;
                    return newFile;
                }
                return jsFile;
            });
        }

        // Save the modified manifest
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        logSuccess(`Manifest updated (${changesCount} references modified)`);

    } catch (error) {
        logError(`Error while updating manifest: ${error.message}`);
    }
}

// Create ZIP archive
function createZip() {
    return new Promise((resolve, reject) => {
        logInfo('Creating ZIP archive...');

        const outputPath = path.join(config.outputDir, config.outputName);

        // Remove old file if exists
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
            log('  🗑️  Old ZIP deleted', colors.yellow);
        }

        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        output.on('close', () => {
            const sizeKB = Math.round(archive.pointer() / 1024 * 10) / 10;
            logSuccess(`Archive created: ${config.outputName} (${sizeKB} KB)`);
            resolve();
        });

        archive.on('error', (err) => {
            logError(`Error while creating ZIP: ${err.message}`);
            reject(err);
        });

        archive.pipe(output);
        archive.directory(config.buildDir, false);
        archive.finalize();
    });
}

// Show final stats
function showStats() {
    log('\n📊 Build summary:', colors.cyan);

    const buildFiles = fs.readdirSync(config.buildDir);
    const jsMinified = buildFiles.filter(file => file.endsWith('.min.js')).length;
    const totalFiles = buildFiles.length;

    log(`  📁 Source folder: ${config.extensionDir}`, colors.white);
    log(`  🔧 Build folder: ${config.buildDir}`, colors.white);
    log(`  📦 Archive: ${path.join(config.outputDir, config.outputName)}`, colors.white);
    log(`  📄 Total files: ${totalFiles}`, colors.white);
    log(`  🔧 Minified JS files: ${jsMinified}`, colors.white);
}

// Main function
async function main() {
    console.log('\n' + '='.repeat(50));
    log('🚀 BUILD EXTENSION GESTNOTE RANKING', colors.bright + colors.cyan);
    console.log('='.repeat(50) + '\n');

    try {
        // Pre-checks
        if (!checkTerser()) {
            if (!installTerser()) {
                process.exit(1);
            }
        } else {
            logSuccess('Terser available');
        }

        // Build process
        createDirectories();
        copyNonJsFiles();
        minifyJsFiles();
        updateManifest();
        await createZip();

        // Final stats
        showStats();

        log('\n🎉 Build completed successfully!', colors.bright + colors.green);

    } catch (error) {
        logError(`Fatal error: ${error.message}`);
        process.exit(1);
    }
}

// Command line handling
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: node build-extension.js [options]

Options:
  --help, -h        Show this help
  --clean           Clean the build folder
  --output <name>   Output ZIP file name

Example:
  node build-extension.js --clean --output "my-extension.zip"
`);
    process.exit(0);
}

// Parse arguments
const cleanIndex = process.argv.indexOf('--clean');
if (cleanIndex !== -1) {
    config.cleanBuild = true;
}

const outputIndex = process.argv.indexOf('--output');
if (outputIndex !== -1 && process.argv[outputIndex + 1]) {
    config.outputName = process.argv[outputIndex + 1];
}

// Run the script
main();
