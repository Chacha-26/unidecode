// @ts-check

(async function (tasks) {
    const args = process.argv.slice(2);

    if (args[0] === "-v") {
        args.shift();
        for (const taskname in tasks) {
            if (taskname[0] === "_") continue;
            const { value } = Reflect.getOwnPropertyDescriptor(tasks, taskname) || { value: null };
            if (value && value.constructor && value.constructor.name === "AsyncFunction") {
                Reflect.set(tasks, taskname, async function (...args) {
                    console.log("Starting Task " + value.name);
                    console.time("\nFinished Task " + value.name);
                    try {
                        return await Reflect.apply(value, this, args);
                    } finally { 
                        console.timeEnd("\nFinished Task " + value.name);
                    }
                });
            }
        }
    }

    const task = String(args.shift()).toLowerCase(); 

    if (tasks[0] != "_" && tasks.hasOwnProperty(task)) {
        try {
            await tasks[task](... args);
        } catch(e) {
            console.error("An error occurred running task {%s}", task);
            console.error(e);
        }
    } else {
        console.error("Task {%s} does not exist", task);
    }
})({
    // imports
    get util() { return super.util = require("util") },
    get rimraf() { return super.rimraf = this.util.promisify(require("rimraf")) },
    get spawnSync() { return super.spawnSync = require("child_process").spawnSync },

    // all helper methods must be sync
    _node(...args) {
        return this.spawnSync("node", args, { stdio: [0, 1, 2] });
    },

    _typescript(...args) {
        return this._node("./node_modules/typescript/lib/tsc.js", ...args);
    },

    _rollup(...args) {
        return this._node("./node_modules/rollup/bin/rollup", ...args)
    },

    _nyc(...args) {
        return this._node("./node_modules/nyc/bin/nyc.js", ...args);
    },

    _ava(...args) {
        return this._nyc("--reporter=lcov", "ava", ...args);
    },

    // all tasks must be async (except default task)
    async clean() {
        await this.rimraf("./build/");
        await this.rimraf("./coverage/");
        await this.rimraf("./dist/");
    },

    async bundle() {
        this._rollup("-c");
    },

    async data(source = "perl") {
        this._typescript("-p", "tsconfig.data.json");
        this._node("./build/generate_data.js", source);
    },

    async build(source = null) {
        if (source) await this.data(source);

        this._typescript("-p", "tsconfig.build.json");
        
        await this.bundle();
    },

    async test() {
        this._typescript("-p", "tsconfig.test.json");
        this._ava("./build/test.js");
        this._nyc("report");
    },

    // default task
    undefined() {
        process.exitCode = 1;

        const tasks = Object.keys(this)
            .filter(name => {
                if (name[0] === "_") return false;
                const desc = Reflect.getOwnPropertyDescriptor(this, name);
                return desc && desc.value && desc.value.constructor && desc.value.constructor.name === "AsyncFunction";
            });

        console.log(`\x1b[4mUsage\x1b[m: \x1b[35mnode task\x1b[m { \x1b[34m${ tasks.join("\x1b[m | \x1b[34m") }\x1b[m }`);
    },
});
