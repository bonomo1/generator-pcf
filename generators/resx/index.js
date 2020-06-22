"use strict";
const Generator = require("yeoman-generator");
const utils = require("../utils");

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.argument("controlName", { type: String, required: false });

    this.option("lcid", {
      type: Number,
      description: "Language Code ID",
      alias: "lc"
    });
  }

  prompting() {
    utils.greeting(this);

    let locales = require("./lcid.json");

    const prompts = [
      {
        type: "list",
        name: "lcid",
        message: "Choose RESX language",
        choices: locales,
        when: !this.options.lcid
      }
    ];

    return this.prompt(prompts).then(props => {
      this.lcid = this.options.lcid || props.lcid;
    });
  }

  writing() {
    let controlName =
      this.config.get("controlName") || this.options.controlName;
    let lcid = this.lcid;

    utils.createResxFile(this, controlName, lcid);
  }
};
