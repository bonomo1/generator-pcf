"use strict";
const Generator = require("yeoman-generator");
const utils = require("../utils");
const manifest = require("../manifest");

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.option("skip-msbuild", {
      type: Boolean,
      description: "Do not run MSBuild at end",
      default: false,
      alias: "sb"
    });

    this.option("skip-solution", {
      type: Boolean,
      description: "Do not create CDS soution project",
      default: false,
      alias: "ss"
    });

    this.option("controlNamespace", {
      type: String,
      desc: "Control Namespace",
      required: false,
      alias: "ns"
    });

    this.option("controlName", {
      type: String,
      desc: "Control name",
      required: false,
      alias: "n"
    });

    this.option("controlTemplate", {
      type: String,
      desc: "Choose control template",
      required: false,
      alias: "t"
    });

    this.option("npmPackage", {
      type: Number,
      desc: "Additional NPM packages",
      required: false,
      alias: "pkg"
    });

    this.option("publisherPrefix", {
      type: String,
      desc: "Publisher Prefix",
      required: false,
      alias: "pp"
    });

    this.option("publisherName", {
      type: String,
      desc: "Publisher Name",
      required: false,
      alias: "pn"
    });

    this.option("solutionPackageType", {
      type: String,
      desc: "Solution Package Type",
      required: false,
      alias: "spt"
    });
  }

  prompting() {
    utils.greeting(this);
    utils.checkPrerequisites(this, this.options["skip-msbuild"]);

    const prompts = [
      {
        type: "input",
        name: "controlNamespace",
        message: "Control namespace",
        default: "Fic",
        when: !this.options.controlNamespace,
        store: true
      },
      {
        type: "input",
        name: "controlName",
        message: "Control name",
        default: "SuperCoolControl",
        when: !this.options.controlName
      },
      {
        type: "list",
        name: "controlTemplate",
        message: "Choose control template",
        choices: ["Field", "Dataset"],
        when: !this.options.controlTemplate
      },
      {
        type: "list",
        name: "npmPackage",
        message: "Additional NPM packages?",
        choices: [
          {
            name: "None",
            value: 0
          },
          {
            name: "React",
            value: 1
          },
          {
            name: "React + Fluent UI",
            value: 2
          }
        ],
        when: ![0, 1, 2].includes(this.options.npmPackage)
      },
      {
        type: "input",
        name: "publisherPrefix",
        message: "Publisher prefix",
        default: "fic",
        when: !this.options.publisherPrefix && !this.options["skip-solution"],
        store: true
      },
      {
        type: "input",
        name: "publisherName",
        message: "Publisher Name",
        default: "Ivan Ficko",
        when: !this.options.publisherName && !this.options["skip-solution"],
        store: true
      },
      {
        type: "list",
        name: "solutionPackageType",
        message: "Which type of solution do you want to build?",
        when:
          !this.options.solutionPackageType && !this.options["skip-solution"],
        choices: ["Both", "Managed", "Unmanaged"]
      }
    ];

    return this.prompt(prompts).then(props => {
      this.controlNamespace =
        this.options.controlNamespace || props.controlNamespace;
      this.controlName = this.options.controlName || props.controlName;
      this.controlTemplate =
        this.options.controlTemplate || props.controlTemplate;
      this.npmPackage = this.options.npmPackage || props.npmPackage;
      this.publisherPrefix =
        this.options.publisherPrefix || props.publisherPrefix;
      this.publisherName = this.options.publisherName || props.publisherName;
      this.solutionPackageType =
        this.options.solutionPackageType || props.solutionPackageType;

      this.config.set("controlNamespace", this.controlNamespace);
      this.config.set("controlName", this.controlName);
      this.config.set("controlTemplate", this.controlTemplate);
      this.config.set("npmPackage", this.npmPackage);
      this.config.set("publisherPrefix", this.publisherPrefix);
      this.config.set("publisherName", this.publisherName);

      this.config.save();
    });
  }

  writing() {
    this.spawnCommandSync(
      `pac pcf init -ns ${this.controlNamespace} -n ${
        this.controlName
      } -t ${this.controlTemplate.toString().toLowerCase()}`
    );

    let pkgJson = require(this.destinationPath("package.json"));
    pkgJson.scripts["start-watch"] = "pcf-scripts start watch";

    if (this.npmPackage === 2) {
      pkgJson.dependencies["@fluentui/react"] = "^7.112.0";
    }

    if (this.npmPackage !== 0) {
      pkgJson.dependencies.react = "^16.13.1";
      pkgJson.dependencies["react-dom"] = "^16.13.1";
      pkgJson.dependencies["@types/react"] = "^16.9.35";
      pkgJson.dependencies["@types/react-dom"] = "^16.9.8";

      this.fs.writeJSON(this.destinationPath("package.json"), pkgJson);
    }

    this.fs.copyTpl(
      this.templatePath("_sample.css"),
      this.destinationPath(`${this.controlName}/css/${this.controlName}.css`),
      {
        controlName: this.controlName,
        controlNamespace: this.controlNamespace
      }
    );
    manifest.addCssFile(this, this.controlName, `${this.controlName}.css`);

    this.fs.copy(
      this.templatePath("_preview.png"),
      this.destinationPath(`${this.controlName}/img/preview.png`)
    );
    manifest.addPreviewImage(this, this.controlName, "img/preview.png");

    utils.createResxFile(this, this.controlName, 1033);

    if (!this.options["skip-solution"]) {
      var normalizedPublisherName = this.publisherName
        .replace(/ /g, "")
        .toLowerCase();
      var normalizedPublisherPrefix = this.publisherPrefix
        .replace(/ /g, "")
        .toLowerCase();

      this.spawnCommandSync(`mkdir Solution`);
      this.spawnCommandSync(`mkdir ${this.controlName}`, null, {
        cwd: `${this.destinationPath()}\\Solution`
      });
      this.spawnCommandSync(
        `pac solution init -pn "${normalizedPublisherName}" -pp ${normalizedPublisherPrefix}`,
        null,
        { cwd: `${this.destinationPath()}\\Solution\\${this.controlName}` }
      );
      this.spawnCommandSync(`pac solution add-reference -p ../..`, null, {
        cwd: `${this.destinationPath()}\\Solution\\${this.controlName}`
      });

      utils.setSolutionPackageType(
        this,
        this.controlName,
        this.solutionPackageType
      );
    }
  }

  install() {
    this.npmInstall().then(() => {
      var skipMsbuild = this.options["skip-msbuild"];
      var skipSolution = this.options["skip-solution"];

      if (!skipMsbuild && !skipSolution) {
        this.spawnCommandSync("msbuild", ["/t:build", "/restore"], {
          cwd: `${this.destinationPath()}\\Solution\\${this.controlName}`
        });
      }
    });
  }
};
