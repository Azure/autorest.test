/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license output.pushrmation.
 *--------------------------------------------------------------------------------------------*/

import { abbre, uniqueName, Indent, ToSnakeCase, ToMultiLine, } from "../Common/Helpers";
import { Model } from "../Common/Model";
import { Example, ReferenceType, ExampleWarning, ExampleVariable } from "../Common/Example";
// import { ToMultiLine } from "@autorest/az/dist/utils/helper";

export function AddVariables(model: Model, prefix: string, output: string[]) {
    // get variables from all examples
    let vars: ExampleVariable[] = model.getVars();
    vars.forEach(v => {
        if (v.name != "resource_group" && v.name != "azure_location") {
            output.push(prefix + v.name.toUpperCase() + " = \"" + v.value + "\"" + (v.unique ? " + UNIQUE" : ""));
        }
    });
}

export function AppendExample(model: Model, prefix: string, ci: number, output: string[], isTest: boolean) {
    var example: Example = null;
    for (var i = 0; i < model.examples.length; i++)
    {
        if (model.examples[i].Id == model.config[ci]['name'])
        {
            example = model.examples[i];
            break;
        }
    }
    if (example == null)
        return;

    let hasBody: boolean = (example.GetExampleBodyName() != null);
    let bodyParamName = uniqueName((example.GetExampleBodyName() + "_body").toUpperCase());

    output.push("        #--------------------------------------------------------------------------");

    if (model.config[ci]['comment'] != null) {
        output.push(prefix + "# " + model.config[ci]['comment']);
    }

    output.push(prefix + "# " + example.Id + "[" + example.Method + "]");
    output.push("        #--------------------------------------------------------------------------");

    if (!isTest) {
        output.push(prefix + "print(\"" + example.Id.split("/").pop() + "\")");
    }
    if (hasBody)
    {
        if (!example.FlattenBody) {
            var json: string[] = GetExampleBodyJson(_PythonizeBody(example.GetExampleBody()));
            let lineno = 0;
            for (let line of json)
            {
                if (lineno==0)
                {
                    output.push(prefix + `${bodyParamName} = ` + line);
                }
                else
                {
                    output.push(prefix + line);
                }
                lineno += 1;
            }
        } else {
            let body = example.GetExampleBody();
            for (let k in body) {
                if (typeof body[k] == "object") {
                    var json: string[] = GetExampleBodyJson(_PythonizeBody(body[k]));

                    for (let line of json)
                    {
                        if (line.startsWith("{"))
                        {
                            output.push(prefix + ToSnakeCase(k).toUpperCase() +  " = " + line);
                        }
                        else
                        {
                            output.push(prefix + line);
                        }
                    }        
                }
            }
        }
    }

    let clientParams = _UrlToParameters(example.Url);

    if (hasBody) {
        if (example.FlattenBody) {
            let body = example.GetExampleBody();

            for (let k in body) {
                if (clientParams != "") clientParams += ", ";
                // XXX - support more complex bodies
                if (typeof body[k] == "object") {
                    clientParams += ToSnakeCase(k) + "=" + ToSnakeCase(k).toUpperCase();
                } else {
                    clientParams += ToSnakeCase(k) + "=\"" + body[k] + "\"";
                }
            }
        } else {
            if (clientParams != "") clientParams += ", ";
            clientParams += ToSnakeCase(example.GetExampleBodyName()) + `=${bodyParamName}`;
        }
    }

    clientParams = _ReplaceVariables(clientParams);

    // attach query parameters
    if (example.QueryParameters.length > 0) {
        example.QueryParameters.forEach(qp => {
            if (qp != "api-version") {
                if (clientParams != "") clientParams += ", ";
                let paramName: string = ToSnakeCase(qp);

                if (paramName.startsWith("$")) {
                    paramName = paramName.slice(1);
                }
                clientParams += paramName + "=\"" + example.Example["parameters"][qp] + "\"";
            }
        });
    }

    // format params like: xxx, xxx, xxx

    let disabled = model.config[ci]['disabled'] ? "# " : "";

    let op = ((ToSnakeCase(example.OperationName) != "") ? (ToSnakeCase(example.OperationName) + ".") : "") + ((example.LongRunning && model.track2) ? "begin_" : "") + ToSnakeCase(example.MethodName);
    let resultParam = "result_" + abbre(op);
    ToMultiLine(prefix + disabled + `${resultParam} = ` + (isTest ? "self." : "") + "mgmt_client." + op + "(" + clientParams + ")", output);
    //output.push(prefix + disabled + `${resultParam} = ` + (isTest ? "self." : "") + "mgmt_client." + op + "(" + clientParams + ")");
    if (example.LongRunning)
    {
        output.push(prefix + disabled + `${resultParam} = ${resultParam}.result()`);
    }
}

export function GetExampleBodyJson(body: any): string[]
{
    var json: string = "{}";

    if (body != null)
    {
        //this.bodyNormalize(body);
        json = JSON.stringify(body, null, "  ");
    }

    // XXX check if \n is sufficient
    var lines: string[] = json.split("\n");

    for (var i = 0; i < lines.length; i++)
    {
        var l: string = lines[i];
        if (lines[i].endsWith(": true"))
        {
            l = l.replace(": true", ": True");
        }
        else if (lines[i].endsWith(": true,"))
        {
            l = l.replace(": true,", ": True,");
        }
        else if (lines[i].endsWith(": false"))
        {
            l = l.replace(": false", ": False");
        }
        else if (lines[i].endsWith(": false,"))
        {
            l = l.replace(": false,", ": False,");
        }

        l = _ReplaceVariables(l);

        lines[i] = l;
    }
    return lines;
}

export function _ReplaceVariables(l: string) : string {
    if (l.indexOf("{{") >= 0)
    {
        var idx: number = 0;
        while ((idx = l.indexOf("{{", idx)) > 0)
        {
            var start: number = idx;
            var end: number = l.indexOf("}}", idx) + 2;
            var part: string = l.substring(start, end);
            var name: string = part.substring(2, part.length - 2).trim();

            let prefix = "\" + ";
            let postfix = " + \"";

            if (l[end] == '"') {
                postfix = "";
                end++;
            }

            if (l[start -1 ] == '"') {
                prefix = "";
                start--;
            }
            part = l.substring(start, end);

            l = l.replace(part, prefix + name.toUpperCase() + postfix);
            idx = end + 2;
        }
    }
    return l;
}

export function _UrlToParameters(sourceUrl: string): string
{
    var parts: string[] = sourceUrl.split("/");
    var params = [];

    for (var i: number = 0; i < parts.length; i++)
    {
        var part: string = parts[i];

        if (part.startsWith("{{"))
        {
            var varName: string = part.substring(2, part.length - 3).trim().toUpperCase();

            if (varName == "SUBSCRIPTION_ID") continue;

            if (varName == "RESOURCE_GROUP")
            {
                params.push('resource_group_name=RESOURCE_GROUP');
            }
            else
            {
                params.push(varName.toLowerCase() + "=" + varName);
            }
        }
    }
    return params.join(', ');
}

export function _PythonizeBody(body: any): any
{
    if (typeof body == "string" || typeof body == "number" || typeof body == "boolean")
    {
        return body;
    }

    if (body instanceof Array)
    {
        for (var i: number = 0; i < body.length; i++)
        {
            body[i] = _PythonizeBody(body[i]);
        }
        return body;
    }
    
    for (let k in body)
    {
        let newBody: any = {};

        for (let k in body)
        {
            newBody[ToSnakeCase(k)] = _PythonizeBody(body[k]);
        }
        return newBody;
    }
}
