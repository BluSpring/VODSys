const chalk = require('chalk');
const fs = require('fs');

module.exports = class Logger {
    /**
     * Aurana's own logger :D
     * @param {string} name - The file name
     */
    constructor(name = "Main", logFile = null) {
        this.name = name;
        /*this.logFile = logFile || `./logs/${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}-${new Date().toLocaleTimeString('en-GB', {hour12:false}).replace(/:/g, '-')}.log`;
        
        if (!fs.existsSync(this.logFile))
            fs.writeFileSync(this.logFile, `[Aurana : Logged at ${new Date().toLocaleDateString('en-GB')} - ${new Date().toLocaleTimeString('en-GB', {hour12:false})}]`);*/
    }

    /**
     * Writes INFO to stdout and to log file
     * @param  {...string} args
     */
    log(...args) {
        console.log(`${chalk.green(new Date().toLocaleString('en-GB', {hour12:false}))} ${chalk.yellow('>>')} ${chalk.bgGreen('INFO')} : ${chalk.blueBright(this.name)} - ${args.join(' ')}`);
        //fs.appendFileSync(this.logFile, `\r\n${new Date().toLocaleString('en-GB', {hour12:false})} >> INFO : ${this.name} - ${args.join(' ')}`);
    }

    /**
     * Writes INFO to stdout and to log file (copy of Logger.log)
     * @param  {...string} args
     */
    info(...args) {
        this.log(...args);
    }

    /**
     * Writes WARN to stderr and to log file
     * @param  {...string} args
     */
    warn(...args) {
        console.warn(`${chalk.green(new Date().toLocaleString('en-GB', {hour12:false}))} ${chalk.yellow('>>')} ${chalk.bgYellow('WARN')} : ${chalk.blueBright(this.name)}  - ${args.join(' ')}`);
        //fs.appendFileSync(this.logFile, `\r\n${new Date().toLocaleString('en-GB', {hour12:false})} >> WARN : ${this.name} - ${args.join(' ')}`);
    }

    /**
     * Writes ERROR to stderr and to log file
     * @param  {...string} args
     */
    error(...args) {
        console.log(`${chalk.green(new Date().toLocaleString('en-GB', {hour12:false}))} ${chalk.yellow('>>')} ${chalk.bgRed('ERROR')} : ${chalk.blueBright(this.name)}  - ${args.join(' ')}`);
        //fs.appendFileSync(this.logFile, `\r\n${new Date().toLocaleString('en-GB', {hour12:false})} >> ERROR : ${this.name} - ${args.join(' ')}`);
    }

    /**
     * Writes ERROR to stderr and to log file. (copy of Logger.error)
     * @param  {...string} args
     */
    err(...args) {
        this.error(...args);
    }

    /**
     * Writes DEBUG to stdout and to log file.
     * @param  {...string} args 
     */
    debug(...args) {
        console.debug(`${chalk.green(new Date().toLocaleString('en-GB', {hour12:false}))} ${chalk.yellow('>>')} ${chalk.bgCyan('DEBUG')} : ${chalk.blueBright(this.name)}  - ${args.join(' ')}`);
        //fs.appendFileSync(this.logFile, `\r\n${new Date().toLocaleString('en-GB', {hour12:false})} >> DEBUG : ${this.name} - ${args.join(' ')}`);
    }
}