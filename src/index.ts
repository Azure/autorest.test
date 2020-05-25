import { AutoRestExtension, Channel } from '@azure-tools/autorest-extension-base';
import * as yaml from "node-yaml";

// Generic
import { ExampleProcessor } from "./Common/ExampleProcessor"; 
import { Example, ExampleWarning } from "./Common/Example";

// Generators
import { GenerateIntegrationTest, GenerateDefaultTestScenario } from "./IntegrationTest/Generator";
import { WSAEHOSTDOWN } from 'constants';

export type LogCallback = (message: string) => void;
export type FileCallback = (path: string, rows: string[]) => void;

const extension = new AutoRestExtension();

export enum ArtifactType
{
    ArtifactTypeSwaggerIntegrationTest,
    ArtifactTypePythonIntegrationTest,
    ArtifactTypePythonExample
}

extension.Add("test", async autoRestApi => {

    let log = await autoRestApi.GetValue("log");

    function Info(s: string)
    {
        if (log)
        {
            autoRestApi.Message({
                Channel: Channel.Information,
                Text: s
            });
        }
    }

    function Error(s: string)
    {
        autoRestApi.Message({
            Channel: Channel.Error,
            Text: s
        });
    }

    function Warning(s: string)
    {
        autoRestApi.Message({
            Channel: Channel.Warning,
            Text: s
        });
    }

    function WriteFile(path: string, rows: string[])
    {
        autoRestApi.WriteFile(path, rows.join('\r\n'));
    }

    try
    {
        // read files offered to this plugin
        const inputFileUris = await autoRestApi.ListInputs();

        const inputFiles: string[] = await Promise.all(inputFileUris.map(uri => autoRestApi.ReadFile(uri)));

        let artifactType: ArtifactType;

        // namespace is the only obligatory option
        // we will derive default "package-name" and "root-name" from it
        const cli = await autoRestApi.GetValue("cli");
        const python = await autoRestApi.GetValue("python");
        let namespace = python['namespace'] || cli['namespace'];
        let packageName = python['package-name'] || cli['package-name'];
        const payloadFlatteningThreshold = python['payload-flattening-threshold'];

        let testScenario = cli["test-setup"] || cli["test-scenario"] || cli["test"];
        let scenarios: any = testScenario ? GetScenarios(testScenario) : {};
        let track2: boolean = await autoRestApi.GetValue("track2");

        if (!namespace)
        {
            if (!packageName) {
                Error(JSON.stringify(python));
                Error("\"namespace\" is not defined, please add readme.cli.md file to the specification.");
                return;
            } else {
                namespace = packageName.replace(/\-/g, '.');
            }
        }

        let namespaceParts: string[] = namespace.split('.');

        while (namespaceParts.length > 3) {
            namespaceParts.pop();
        }

        if (namespaceParts.length < 3) {
            Error("Wrong namespace: " + namespace);
            return;
        }

        namespace = namespaceParts.join(".");

        // package name and group name can be guessed from namespace
        if (!packageName) {
            packageName = namespace.replace(/\./g, '-');
        }
        let cliName = packageName.split('-').pop();

        /*----------------------------------------------------*/
        let tag = await autoRestApi.GetValue("tag");
        Info(tag);
        
        if (await autoRestApi.GetValue("swagger-integration-test"))
        {
            Info("GENERATION: --swagger-integration-test");
            artifactType = ArtifactType.ArtifactTypeSwaggerIntegrationTest;
        }
        else if (await autoRestApi.GetValue("python-integration-test"))
        {
            Info("GENERATION: --python-integration-test");
            artifactType = ArtifactType.ArtifactTypePythonIntegrationTest;
        }
        else if (await autoRestApi.GetValue("python-example"))
        {
            Info("GENERATION: --python-example");
            artifactType = ArtifactType.ArtifactTypePythonExample;
        }

        for (let iff of inputFiles)
        {
            //-------------------------------------------------------------------------------------------------------------------------
            //
            // Generate Default Test Scenario
            //
            //-------------------------------------------------------------------------------------------------------------------------
            if (Object.keys(scenarios).length == 0) {
                let swagger = JSON.parse(iff);
                let exampleProcessor = new ExampleProcessor(swagger, testScenario, payloadFlatteningThreshold, Warning);
                let examples: Example[] = exampleProcessor.GetExamples();
                testScenario = GenerateDefaultTestScenario(examples, Warning);
                scenarios[""] = testScenario;
            }

            for (let k of Object.keys(scenarios)) {
                //-------------------------------------------------------------------------------------------------------------------------
                //
                // PARSE INPUT MODEL
                //
                //-------------------------------------------------------------------------------------------------------------------------
                let swagger = JSON.parse(iff);

                //-------------------------------------------------------------------------------------------------------------------------
                //
                // PROCESS EXAMPLES
                //
                //-------------------------------------------------------------------------------------------------------------------------
                let exampleProcessor = new ExampleProcessor(swagger, scenarios[k], payloadFlatteningThreshold, Warning);
                let examples: Example[] = exampleProcessor.GetExamples();

                //-------------------------------------------------------------------------------------------------------------------------
                //
                // GENERATE DEFAULT TEST SCENARIO IF DOESN'T EXIST
                //
                //-------------------------------------------------------------------------------------------------------------------------
                if (!testScenario)
                {
                    testScenario = GenerateDefaultTestScenario(examples, Warning);
                    exampleProcessor = new ExampleProcessor(swagger, scenarios[k], payloadFlatteningThreshold, Warning);
                }

                //-------------------------------------------------------------------------------------------------------------------------
                //
                // GET ADDITIONAL INFORMATION FROM SWAGGER
                //
                //-------------------------------------------------------------------------------------------------------------------------
                let mgmtClientName = swagger['name'];
                // XXX - consider other options here

                //-------------------------------------------------------------------------------------------------------------------------
                //
                // INTEGRATION TESTS
                //
                //-------------------------------------------------------------------------------------------------------------------------
                if (artifactType == ArtifactType.ArtifactTypeSwaggerIntegrationTest ||
                    artifactType == ArtifactType.ArtifactTypePythonIntegrationTest ||
                    artifactType == ArtifactType.ArtifactTypePythonExample)
                {
                    GenerateIntegrationTest(artifactType,
                                            scenarios[k],
                                            k,
                                            examples,
                                            namespace,
                                            cliName,
                                            packageName,
                                            mgmtClientName,
                                            track2,
                                            exampleProcessor.MethodsTotal,
                                            exampleProcessor.MethodsCovered,
                                            exampleProcessor.ExamplesTotal,
                                            exampleProcessor.ExamplesTested,
                                            WriteFile,
                                            Info)
                }

                let warnings: ExampleWarning[] = exampleProcessor.GetWarnings();

                warnings.forEach(warning => {
                    Warning(warning.ExampleName + ": " + warning.Description);
                });
            }
        }
    }
    catch (e)
    {
        Error(e.message + " -- " + JSON.stringify(e.stack));
    }
});

function GetScenarios(raw: any): any {
    // this function returns dictionary of arrays
    let name: string = "";
    let tests: any[] = [];
    let source: any[] = raw;
    let dest: any = {};
    
    // assume "raw" is always an array for now
    for (let i = 0; i < source.length; i++) {
        if (source[i]['split'] == undefined) {
            tests.push(source[i]);
        } else {
            if (tests.length > 0) {
                dest[name] = tests;
            }
            tests = [];
            name = source[i]['split'];
        }
    }

    if (tests.length > 0) {
        dest[name] = tests;
    }

    return dest;
}

extension.Run();