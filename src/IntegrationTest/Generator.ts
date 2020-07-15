/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ArtifactType, FileCallback, LogCallback } from "../index"
import { Example, ExampleWarning } from "../Common/Example";
import { GeneratePythonIntegrationTest } from "./TemplatePythonIntegrationTest"
import { GeneratePythonExample } from "./TemplatePythonExample"
import { GenerateSwaggerIntegrationTest } from "./TemplateSwaggerIntegrationTest"
import { Model } from "../Common/Model";

export function GenerateDefaultTestScenario(
    examples: Example[],
    warningCb: LogCallback)
{
    warningCb("");
    warningCb("NO TEST SCENARIO PROVIDED - DEFAULT WILL BE USED");
    warningCb("ADD FOLLOWING SECTION TO readme.cli.md FILE TO MODIFY IT");
    warningCb("--------------------------------------------------------");
    warningCb("  test-scenario:");

    let testScenario = [];

    let sorted: Example[] = examples.sort((e1,e2) =>
        {
            let n1 = MethodToOrder(e1.Method);
            let n2 = MethodToOrder(e2.Method);
            if (n1 == n2)
            {
                if (e1.Method == "put") return (e1.Url.length > e2.Url.length) ? 1 : -1;
                else  return (e1.Url.length > e2.Url.length) ? -1 : 1;
            }                
            return (n1 > n2) ? 1 : -1;
        })

    for (var i = 0; i < sorted.length; i++)
    {
        var example: Example = examples[i];
        warningCb("    - name: " + example.Id);
        testScenario.push({ name: example.Id })
    }
    warningCb("--------------------------------------------------------");
    return testScenario;
}

export function GenerateIntegrationTest(artifactType: ArtifactType,
                                        testScenario: any,
                                        postfix: string,
                                        examples: Example[],
                                        namespace: string,
                                        cliName: string,
                                        packageName: string,
                                        mgmtClientName: string,
                                        track2: boolean,
                                        methodsTotal: number,
                                        methodsCovered: number,
                                        examplesTotal: number,
                                        examplesTested: number,
                                        coverageMap: {},
                                        fileCb: FileCallback,
                                        logCb: LogCallback)
{
    let code: string[] = [];
    let path: string = "";

    logCb("");
    logCb("TEST SCENARIO COVERAGE");
    logCb("----------------------");
    logCb("Methods Total   : " + methodsTotal);
    logCb("Methods Covered : " + methodsCovered);
    logCb("Examples Total  : " + examplesTotal);
    logCb("Examples Tested : " + examplesTested);
    logCb("Coverage %      : " + ((methodsCovered / methodsTotal) * (examplesTested / examplesTotal) * 100).toFixed());
    logCb("----------------------");
 
    if (artifactType == ArtifactType.ArtifactTypePythonIntegrationTest)
    {
        let model: Model = new Model(examples,
            testScenario,
            namespace,
            cliName,
            mgmtClientName,
            track2,
            methodsTotal,
            methodsCovered,
            examplesTotal,
            examplesTested,
            coverageMap);
        code = GeneratePythonIntegrationTest(model);
      //path = "sdk/" + packageName.split("-").pop() + "/" +  packageName + "/tests/";
      path = "tests/";
      path += "test_cli_mgmt_" + cliName.replace(/-/g, '_') + ((postfix != "") ? ("_" + postfix) : "") + ".py";
    }
    else if (artifactType == ArtifactType.ArtifactTypePythonExample)
    {
        let model: Model = new Model(examples,
            testScenario,
            namespace,
            cliName,
            mgmtClientName,
            track2,
            methodsTotal,
            methodsCovered,
            examplesTotal,
            examplesTested,
            coverageMap);
        code = GeneratePythonExample(model);
      //path = "sdk/" + packageName.split("-").pop() + "/" +  packageName + "/tests/";
      path = "examples/";
      path += "example_" + cliName.replace(/-/g, '_') + ((postfix != "") ? ("_" + postfix) : "") + ".py";
    }
    else
    {
        code = GenerateSwaggerIntegrationTest(examples, testScenario);
        path += "test_cli_mgmt_" + cliName.replace(/-/g, '_') + ((postfix != "") ? ("_" + postfix) : "") + ".py";
    }

    fileCb(path, code);
}

function MethodToOrder(method: string): number
{
    if (method == 'put') return 0;
    else if (method == 'get') return 1;
    else if (method == 'delete') return 3;
    else return 2;
}
