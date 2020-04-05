import { AutoRestExtension, Channel } from '@azure-tools/autorest-extension-base';
import * as yaml from "node-yaml";

// Generic
import { MapGenerator } from "./Common/MapGenerator"
import { ExampleProcessor } from "./Common/ExampleProcessor"; 
import { Example } from "./Common/Example";

// Generators
import { GenerateIntegrationTest, GenerateDefaultTestScenario } from "./IntegrationTest/Generator";

import { MapModuleGroup } from "./Common/ModuleMap";

export type LogCallback = (message: string) => void;
export type FileCallback = (path: string, rows: string[]) => void;

const extension = new AutoRestExtension();

export enum ArtifactType
{
    ArtifactTypeSwaggerIntegrationTest,
    ArtifactTypePythonIntegrationTest
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
        let writeIntermediate: boolean = false;

        // namespace is the only obligatory option
        // we will derive default "package-name" and "root-name" from it
        const cli = await autoRestApi.GetValue("cli");
        const namespace = cli['namespace'];
        let testScenario = cli["test-setup"] || cli["test-scenario"];

        if (!namespace)
        {
            Error("\"namespace\" is not defined, please add readme.cli.md file to the specification.");
            return;
        }

        // package name and group name can be guessed from namespace
        let packageName = await autoRestApi.GetValue("package-name") || namespace.replace(/\./g, '-');
        let cliName = await autoRestApi.GetValue("group-name") || await autoRestApi.GetValue("cli-name") || packageName.split('-').pop();

        /*----------------------------------------------------*/
        let flattenAll = await autoRestApi.GetValue("flatten-all");
        let tag = await autoRestApi.GetValue("tag");
        Info(tag);
        let generateReport = await autoRestApi.GetValue("report");

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

        if (await autoRestApi.GetValue("intermediate"))
        {
            writeIntermediate = true;
        }

        for (let iff of inputFiles)
        {
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
            let exampleProcessor = new ExampleProcessor(swagger, testScenario);
            let examples: Example[] = exampleProcessor.GetExamples();

            //-------------------------------------------------------------------------------------------------------------------------
            //
            // GENERATE DEFAULT TEST SCENARIO IF DOESN'T EXIST
            //
            //-------------------------------------------------------------------------------------------------------------------------
            if (!testScenario)
            {
                testScenario = GenerateDefaultTestScenario(examples, Warning);
                exampleProcessor = new ExampleProcessor(swagger, testScenario);
            }

            //-------------------------------------------------------------------------------------------------------------------------
            //
            // GENERATE RAW MAP
            //
            //-------------------------------------------------------------------------------------------------------------------------
            let mapGenerator = new MapGenerator(swagger, {}, cliName, examples, function(msg: string) {
                if (log == "map")
                {
                    Info(msg);
                }
            }, Error);
          
            let map: MapModuleGroup = null;
            try
            {
                map = mapGenerator.CreateMap();
            }
            catch (e)
            {
                Error("ERROR " + e.stack);
            }

            if (writeIntermediate)
            {
              autoRestApi.WriteFile("intermediate/" + cliName + "-map-unflattened.yml", yaml.dump(map));
            }

            //-------------------------------------------------------------------------------------------------------------------------
            //
            // MAP FLATTENING AND TRANSFORMATIONS
            //
            //-------------------------------------------------------------------------------------------------------------------------

            //-------------------------------------------------------------------------------------------------------------------------
            //
            // UPDATE TEST DESCRIPTIONS USING TEST SETUP
            //
            //-------------------------------------------------------------------------------------------------------------------------

            if (testScenario)
            {
                testScenario.forEach(element => {
                    if (element['title'] != undefined)
                    {
                        map.Modules.forEach(m => {
                            m.Examples.forEach(e => {
                                if (e.Id == element['name'])
                                {
                                    e.Title = element['title'];
                                }
                            })
                        });
                    }
                });
            }

            //-------------------------------------------------------------------------------------------------------------------------
            //
            // WRITE INTERMEDIATE FILE IF --intermediate OPTION WAS SPECIFIED
            //
            //-------------------------------------------------------------------------------------------------------------------------
            if (writeIntermediate)
            {
                autoRestApi.WriteFile("intermediate/" + cliName + "-input.yml", yaml.dump(swagger));
            }
        
            if (map != null)
            {
                if (writeIntermediate)
                {
                    autoRestApi.WriteFile("intermediate/" + cliName + "-map-pre.yml", yaml.dump(map));
                }

                //-------------------------------------------------------------------------------------------------------------------------
                //
                // INTEGRATION TESTS
                //
                //-------------------------------------------------------------------------------------------------------------------------
                if (artifactType == ArtifactType.ArtifactTypeSwaggerIntegrationTest || artifactType == ArtifactType.ArtifactTypePythonIntegrationTest)
                {
                    GenerateIntegrationTest(artifactType,
                                            testScenario,
                                            examples,
                                            map.Namespace,
                                            cliName,
                                            packageName,
                                            map.MgmtClientName,
                                            exampleProcessor.MethodsTotal,
                                            exampleProcessor.MethodsCovered,
                                            exampleProcessor.ExamplesTotal,
                                            exampleProcessor.ExamplesTested,
                                            WriteFile,
                                            Info)
                }
            }
        }
    }
    catch (e)
    {
        Error(e.message + " -- " + JSON.stringify(e.stack));
    }
});

extension.Run();