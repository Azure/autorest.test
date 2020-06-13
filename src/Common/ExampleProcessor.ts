/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Example, ExampleVariable, ReferenceType, ExampleWarning } from "./Example"
import { ToSnakeCase, ToCamelCase, IsSpecialName } from "../Common/Helpers"
import { LogCallback } from "../index"
import { stringify } from "querystring";

export class ExampleProcessor
{
    public constructor (swagger: any, testScenario: any, payloadFlatteningThreshold: number, warningCb: LogCallback)
    {
        this._log = warningCb;
        this._examples = [];
        this._swagger = swagger;
        this._testScenario = testScenario;
        this._payloadFlatteningThreshold = payloadFlatteningThreshold;

        for (var operationIdx = 0; operationIdx < this._swagger.operations.length; operationIdx++)
        {
            var operation = this._swagger.operations[operationIdx];

            // find out if we have check_name_availability
            let haveCheckNameAvailability: boolean = false;
            for (var methodIdx = 0; methodIdx < operation.methods.length; methodIdx++)
            {
                var method = operation.methods[methodIdx];
                if (method['name']['raw'] == "CheckNameAvailability") haveCheckNameAvailability = true;
            }

            for (var methodIdx = 0; methodIdx < operation.methods.length; methodIdx++)
            {
                var method = operation.methods[methodIdx];

                if (method['extensions'] == undefined || method['extensions']['x-ms-examples'] == undefined)
                    // XXX - warning, no examples
                    continue;

                // find body parameter
                let parameters = method['parameters'];
                let bodyDef = null;
                parameters.forEach(p => {
                    if (p["location"] == "body") {
                        bodyDef = this.FindModelType(p["modelType"]["$ref"]);

                        if (bodyDef == null) {
                            this._log("-------------------------------------- BODY NOT FOUND");
                            //this._log(" " + JSON.stringify(p) );
                            //this._log(" " + p["modelType"]["$ref"]);
                            this._log("----------------------------------------------------");
    
                        }

                    }
                });

                var examplesDictionary = method['extensions']['x-ms-examples'];
                for (var k in examplesDictionary)
                {
                    this._exampleId = "/" + operation['name']['raw'] + "/" + method['httpMethod'] + "/" + k;
   
                    // check if example is included in the test scenario
                    let found: boolean = false;
                    if (this._testScenario) {
                        for (let tsidx = 0; tsidx < this._testScenario.length; tsidx++) {
                            if (this._testScenario[tsidx]['name'] == this._exampleId /*&& !this._testScenario[tsidx]['disabled']*/) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) continue;
                    }
                       
                    var example = examplesDictionary[k];
                    var url = this.NormalizeResourceId(method['url']);
                    var refs: string[] = [];
                    var vars: ExampleVariable[] = [];
                    var filename: string = this.GetExampleFilename(this.NormalizeResourceId(method['url']), method['httpMethod']);
                    var longRunning: boolean = false;

                    if (method['extensions']['x-ms-long-running-operation'])
                    {
                        longRunning = true;
                    }

                    let queryParameters: string[] = [];
                    parameters.forEach(p => {
                        if(p["location"] == "query") {
                            if (example["parameters"][p["name"]["raw"]]) {
                                queryParameters.push(p["name"]["raw"]);
                            }   
                        }
                    });
    
                    let flattenBody = false;
                    let exampleBody = null;
                    for (let k in example["parameters"]) {
                        if (typeof example["parameters"][k] == "object") {
                            exampleBody = example["parameters"][k];
                        }
                    }

                    if (exampleBody != null) {
                        this.ProcessExample(exampleBody, bodyDef, "");

                        if (bodyDef) {
                            let propertiesCount = this.CountProperties(bodyDef);
                            if (propertiesCount <= this._payloadFlatteningThreshold) {
                                flattenBody = true;
                            }
                        }
                    }
                    this.ScanExampleForRefsAndVars(method['httpMethod'], url, method['url'], filename, example, haveCheckNameAvailability, refs, vars);

                    this._examples.push(new Example(example,
                                              url,
                                              method['httpMethod'],
                                              this._exampleId,
                                              filename,
                                              vars,
                                              refs,
                                              this._references,
                                              operation['$id'],
                                              method['$id'],
                                              operation['name']['raw'],
                                              method['name']['raw'],
                                              longRunning,
                                              this._warnings,
                                              flattenBody,
                                              queryParameters));
                }
            }
        }

        this.CountCoverage();
    }

    private _examples: Example[] = null;

    private _swagger: any = null;
    private _testScenario: any = null;

    private _filenames = {};

    private _warnings: ExampleWarning[] = []
    private _references: ReferenceType[] = [];
    private _exampleId: string = null;
    private _payloadFlatteningThreshold = 0;

    public GetWarnings(): ExampleWarning[]
    {
        return this._warnings;
    }

    public GetReferences(): ReferenceType[]
    {
        return this._references;
    }

    public GetExamples(): Example[]
    {
        return this._examples;
    }

    private CountCoverage()
    {
        this.MethodsTotal = 0;
        this.MethodsCovered = 0;
        this.ExamplesTotal = 0;
        this.ExamplesTested = 0;
        for (var idx = 0; idx < this._swagger.operations.length; idx++)
        {
            for (var mi = 0; mi < this._swagger.operations[idx].methods.length; mi++)
            {
                let method = this._swagger.operations[idx].methods[mi];
                this.MethodsTotal++;

                if (method['extensions'] != undefined && method['extensions']['x-ms-examples'] != undefined)
                {
                    this.MethodsCovered++;

                    for (let k in method['extensions']['x-ms-examples'])
                    {
                        let exampleId: string = "/" + this._swagger.operations[idx]['name']['raw'] + "/" + method['httpMethod'] + "/" + k
                        this.ExamplesTotal++;

                        // check if example is in test scenario
                        if (this._testScenario)
                        {
                            for (let item of this._testScenario)
                            {
                                if (item['name'] == exampleId)
                                {
                                    if (!item['disabled']) {
                                        this.ExamplesTested++;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }


    private ProcessExample(body: any, bodyDef: any, path: string)
    {
        if (body instanceof Array)
        {
            //this._log("---------------------------------------------- ARRAY");
            //this._log(" " + path + "/" + "*" );
            //this._log(" " + JSON.stringify(bodyDef) );
            //this._log("----------------------------------------------------");
            
            for (var i = 0; i < body.length; i++)
            {
                this.ProcessExample(body[i], bodyDef, path + "/*");
            }
        }
        else if (typeof body == 'object')
        {
            // dictionary -- 
            for (var pp in body)
            {
                var subv: any = body[pp];
                let flatten: boolean = false;

                if (pp == 'tenantId') {
                    // XXX - check if tenant id formatted properly and display warning if not
                    body[pp] = "{{ tenant_id }}";
                }

                if (typeof subv == 'string')
                {
                    if (subv.startsWith("/subscription"))
                    {
                        body[pp] = this.NormalizeResourceId(subv, true);
                    }
                }
                else
                {
                    let subModel: any = null;
                    if (bodyDef != null) {
                        // find definition
                        if (bodyDef["properties"]) {
                            bodyDef["properties"].forEach(p => {
                                if (p['name']['raw'] == pp) {
                                    if (p['extensions'] && p['extensions']['x-ms-client-flatten']) {
                                        flatten = true;
                                    }

                                    let primary: boolean = false;

                                    if (p['modelType']) {
                                        if (p['modelType']['$type'] == 'SequenceType') {
                                            if (p["modelType"]["elementType"]["$type"] == "PrimaryType" || p['modelType']['$type'] == 'DictionaryType' || p['modelType']['$type'] == 'EnumType') {
                                                primary = true;
                                            } else {
                                                if (p["modelType"]["elementType"]["$ref"] != undefined) {
                                                    subModel = this.FindModelType(p["modelType"]["elementType"]["$ref"]);
                                                } else if (p["modelType"]["elementType"]["$id"] != undefined) {
                                                    subModel = p["modelType"]["elementType"];
                                                }
                                            }
                                        } else if (p['modelType']['$type'] == 'PrimaryType' || p['modelType']['$type'] == 'DictionaryType' || p['modelType']['$type'] == 'EnumType') {
                                            primary = true;
                                        } else {
                                            if (p["modelType"]["$ref"] != undefined) {
                                                subModel = this.FindModelType(p["modelType"]["$ref"]);
                                            } else if (p["modelType"]["$id"] != undefined) {
                                                subModel = p["modelType"];
                                            }
                                        }
                                    }
                                    
                                    if (subModel == null && !primary) {
                                        this._log("-------------------------------------- SUBMODEL NOT FOUND");
                                        this._log(" " + path + "/" + pp );
                                        this._log(" " + JSON.stringify(p) );
                                        this._log("---------------------------------------------------------");
                                    }

                                }
                            });
                        }
                    }

                    this.ProcessExample(subv, subModel, path + "/" + pp);
                    if (pp == "properties" && !flatten) {
                        this._log("-------------------------------------- NOT FLATTENED");
                        this._log(" " + path + "/" + pp );
                        this._log(" " + JSON.stringify(subModel) );
                        this._log(" " + JSON.stringify(bodyDef) );
                        this._log("----------------------------------------------------");
                    }
                }

                // check if this property must be flattened
                if (flatten) {
                    for (let k in subv) {
                        body[k] = subv[k];
                    }
                    delete body[pp];
                }
            }

            // remove name -- as it's usually a duplicate of object name from url
            //if (top) vo.Remove("name");
        }
    }

    private GetExampleFilename(url: string, method: string): string
    {
        return this.GetFilenameFromUrl(url, method, true);
    }

    private GetFilenameFromUrl(url: string, exampleMethod: string, unique: boolean): string
    {
        var parts: string[] = url.split("/");
        var filename: string = "";

        for (var i: number = 0; i < parts.length; i++)
        {
            var part: string = parts[i].toLowerCase();
            var last: boolean = (i == parts.length - 1);

            
            if (part.startsWith("microsoft."))
            {
                // add provided as a first part of filename
                part = part.toLowerCase().substring("microsoft.".length);
            }
            else if (part == "resourcegroups")
            {
                // XXX - fix it
                if (url.indexOf("providers") >= 0)
                    part = "";
            }
            else if (part.startsWith("{") || part == "subscriptions" || part == "" || part == "providers")
            {
                part = "";
                // don't include this
                // url += String.Join("", part.substring(3, part.length - 6).ToLower().split("_")) + "_";
            }
            else
            {
                part = part.toLowerCase();
            }

            if (part != "")
            {
                if (filename != "")
                    filename += "_";

                filename += part;
            }
        }

        if (filename == "")
        {
            // XXX - is it replacing all?
            filename = url.replace("/", "_");
        }

        filename += "_" + exampleMethod;

        if (unique)
        {
            if (this._filenames[filename] != undefined)
            {
                this._filenames[filename]++;
                filename += "_" + this._filenames[filename];
            }
            else
            {
                this._filenames[filename] = 0;
            }
        }

        return filename;
    }

    private ScanExampleForRefsAndVars(method: string, url: string, unprocessedUrl: string, filename: string, example: any, haveCheckNameAvailability: boolean, refs: string[], vars: ExampleVariable[])
    {
        this.ExtractVarsFromUrl(url, unprocessedUrl, example['parameters'], (method == "put") ? haveCheckNameAvailability : false, vars);

        var parts: string[] = url.split("/");

        if (method == "put" || method == "patch")
        {
            this.ScanExampleBodyForReferencesAndVariables(example["parameters"], refs, vars, "");
            var longFilename: string = filename;
    
            // add superresource reference
            for (var i = parts.length - 1; i > 0; i--)
            {
                var sub: string[] = parts.slice(0, i);

                var shortFilename: string = this.GetFilenameFromUrl(sub.join('/'), 'put', false);

                if (shortFilename.length < longFilename.length)
                {
                    if (shortFilename.length > 0 && !shortFilename.startsWith("_") && shortFilename.split("_").length > 2)
                    {
                        refs.push(shortFilename);
                    }
                    break;
                }
            }

            var anyReferences = false;
            for (let ref of refs)
            {
                if (!ref.startsWith("# ref##"))
                    anyReferences = true;
            }

            if (!anyReferences)
            {
                refs.push("resourcegroups_put");
            }
        }

        return refs;
    }

    private ScanExampleBodyForReferencesAndVariables(v: any, refs: string[], vars: ExampleVariable[], path: string)
    {
        if (v instanceof Array)
        {
            for (var i = 0; i < v.length; i++)
            {
                this.ScanExampleBodyForReferencesAndVariables(v[i], refs, vars, path + "/*");
            }
        }
        else if (typeof v == 'object')
        {
            for (var pp in v)
            {
                var subv: any = v[pp];

                if (typeof(subv) == 'string')
                {
                    if (pp == "id" || pp.endsWith("_id") || subv.indexOf("/") >= 0)
                    {
                        if (subv.indexOf("\r") == -1 && subv.indexOf("\n") == -1 && !(pp == "type"))
                        {
                            if (subv.startsWith("/subscription"))
                            {
                                refs.push(this.GetFilenameFromUrl(subv, "put", false));
                                
                                this.ExtractVarsFromUrl(subv, null, null, false, vars);

                                // [ZIM] this is initial, very simple reference implementation
                                if (subv.indexOf("/storageAccounts/") >=0)
                                {
                                    this._references.push(ReferenceType.STORAGE);
                                }
                            }
                            else
                            {
                                refs.push("# ref##" + pp + "##" + subv);
                            }
                        }
                    }

                    if (pp == "storageAccountUrl") {
                        v[pp] = "{{storage_account_url}}";
                        let found = false;
                        for (let v of vars)
                        {
                            if (v.name == "storage_account_url")
                            {
                                found = true;
                            }
                        }

                        if (!found) {
                            let v = new ExampleVariable("storage_account_url", "xxx", "storageAccountUrl");
                            vars.push(v);
                        }
                        
                    } else if (pp == "storageAccessKey" || pp == "storageAccountPrimaryKey") {
                        let found = false;

                        v[pp] = "{{storage_account_key}}";
                        for (let vv of vars)
                        {
                            if (vv.name == "storage_account_key")
                            {
                                found = true;
                            }
                        }

                        if (!found) {
                            let vv = new ExampleVariable("storage_account_key", "xxx", "storageAccessKey");
                            vars.push(vv);
                        }
                    } else if (pp == "location") {
                        v[pp] = "{{azure_location}}";
                    }
                    else if (path + "/" + pp == "/parameters/probes/*/name") {
                        v[pp] = "{{probe_name}}";
                        this.PushVar(vars, "probe_name", "myProbe", null, false);
                    }
                    else if (path + "/" + pp == "/parameters/frontendIPConfigurations/*/name") {
                        v[pp] = "{{frontend_ip_configuration_name}}";
                        this.PushVar(vars, "frontend_ip_configuration_name", "myFrontendIpConfiguration", null, false);
                    }
                    else if (path + "/" + pp == "/parameters/backendAddressPools/*/name") {
                        v[pp] = "{{backend_address_pool_name}}";
                        this.PushVar(vars, "backend_address_pool_name", "myBackendAddressPoolName", null, false);
                    }
                    else if (path + "/" + pp == "/parameters/inboundNatRules/*/name") {
                        v[pp] = "{{inbound_nat_rule_name}}";
                        this.PushVar(vars, "inbound_nat_rule_name", "myInboundNatRuleName", null, false);
                    }
                }
                else
                {
                    this.ScanExampleBodyForReferencesAndVariables(subv, refs, vars, path + "/" + pp);
                }
            }
        }
    }

    private PushVar(vars: ExampleVariable[], name: string, value: string, swaggerName: string, forceUpdate: boolean) {
        let found = false;
        for (let vv of vars)
        {
            if (vv.name == name) {
                if (forceUpdate) vv.value = value;
                return vv;
            }
        }

        let vv = new ExampleVariable(name, value, (swaggerName != null) ? swaggerName : ToCamelCase(name));
        vars.push(vv);
        return vv;
    }

    private ExtractVarsFromUrl(url: string, unprocessedUrl: string, parameters: any, haveCheckNameAvailability: boolean, vars: ExampleVariable[])
    {
        var parts: string[] = url.split("/");
        var unprocessedParts: string[] = (unprocessedUrl ? unprocessedUrl.split("/") : null);
        var last: ExampleVariable = null;

        for (var i: number = 0; i < parts.length; i++)
        {
            var part: string = parts[i];
            let force: boolean = false;
            if (part.startsWith("{{"))
            {
                var varName: string = part.substring(2, part.length - 2).trim().toLowerCase();

                if (varName != "subscription_id")
                {
                    var varValue: string = ToCamelCase(("my_" + varName).split("_name")[0].toLowerCase());

                    var swaggerName: string = (unprocessedUrl ? unprocessedParts[i] : "{}");

                    if (swaggerName)
                    {
                        swaggerName = swaggerName.substr(1, swaggerName.length - 2);

                        if (parameters != null) {
                            if (parameters[swaggerName] && IsSpecialName(parameters[swaggerName])) {
                                varValue = parameters[swaggerName];
                                force = true;
                            } /*else {
                                varValue = "Xxx" + swaggerName;
                            }*/
                        }

                        last = this.PushVar(vars, varName, varValue, swaggerName, force);
                    }
                }
            }
        }

        if (haveCheckNameAvailability) {
            if (last != null) {
                last.unique = true;
            }
        }
    }

    private NormalizeResourceId(oldId: string, verify: boolean = false): string
    {
        var newId: string = "";
        var splitted: string[] = oldId.split("/");
        var idx: number = 0;
    
        while (idx < splitted.length)
        {
            if (splitted[idx] == "")
            {
                //newId += "/";
                idx++;
            }
            else if (idx == 1 && splitted[idx] == "{scope}" && splitted.length > 2 && splitted[idx + 1] == "providers")
            {
                newId += "{scope}";
                idx += 1;
            }
            else if (splitted[idx] == "subscriptions")
            {
                if (verify)
                {
                    if (splitted[idx + 1] != "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
                    {
                        this._warnings.push(new ExampleWarning(this._exampleId, "non-standard subscription id format '" + splitted[idx + 1] + "', should be 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'"));
                    }
                }

                newId += "subscriptions/{{ subscription_id }}";
                idx += 2;
            }
            else if (splitted[idx].toLowerCase() == "resourcegroups")
            {
                newId += "resourceGroups";
                idx++;
                
                if (idx < splitted.length)
                {
                    if (verify && (splitted[idx] != "myResourceGroup"))
                    {
                        this._warnings.push(new ExampleWarning(this._exampleId, "non-standard resource group name '" + splitted[idx] + "', should be 'myResourceGroup'"));
                    }

                    newId += "/{{ resource_group }}";
                    idx++;
                }
            }
            else if (splitted[idx].toLowerCase() == "providers")
            {
                newId += "providers";
                idx++;
    
                if (idx < splitted.length)
                {
                    // Microsoft.XXX
                    newId += "/" + splitted[idx++];
                }
            }
            else
            {
                // subresource_type
                newId += splitted[idx++];
    
                if (idx < splitted.length)
                {
                    let type = splitted[idx - 1];
    
                    // XXX - handle exception like this for now
                    if (type == "portalsettings")
                    {
                        // Next part should not be changed
                        newId += "/" + splitted[idx++];
                    }
                    else
                    {
                        let originalName = splitted[idx - 1];
                        let defaultName = originalName;

                        // check if any special cases
                        if (['AzurePrivatePeering'].indexOf(originalName) < 0) {
                            defaultName = "my" + this.PluralToSingular(originalName.charAt(0).toUpperCase() + originalName.slice(1));
                        }

                        if (verify && (splitted[idx] != defaultName))
                        {
                            this._warnings.push(new ExampleWarning(this._exampleId, "non-standard resource name '" + splitted[idx] + "', should be '" + defaultName + "'"));
                        }

                        if (splitted[idx].charAt(0) == '{' && splitted[idx].charAt(1) != '{' && splitted[idx].indexOf('-') == -1) {
                            let name = ToSnakeCase(splitted[idx].substr(1, splitted[idx].length - 2));
                            if (name == "location") name = "azure_location"
                            newId += "/{{ " + name + " }}";
                        }
                        else
                        {
                            // FIND EXCEPTIONS
                            // newId += "/" + splitted[idx];
                            newId += "/{{ " + this.PluralToSingular(ToSnakeCase(splitted[idx - 1])) + "_name }}";
                        }
                        idx++;
                    }
                }
            }
    
            if (idx < splitted.length) newId += "/";
        }
    
        return newId;
    }

    private PluralToSingular(name: string): string
    {
        // let's try to be smart here, as all operation names are plural so let's try to make it singular
        if (name.endsWith("series"))
        {
            return name;
        }
        if (name.endsWith("ies"))
        {
            name = name.substring(0, name.length - 3) + "y";
        }
        else if (name.endsWith("sses") || name.endsWith("uses"))
        {
            name = name.substring(0, name.length - 2);                
        }
        else if (name.toLowerCase() == "apis")
        {
            name = name.substring(0, name.length - 1);
        }
        else if (name.toLowerCase().endsWith("xes"))
        {
            name = name.substring(0, name.length - 2);
        }
        else if (name.endsWith('s') && !name.endsWith("us") && !name.endsWith("ss") && !name.endsWith("is"))
        {
            name = name.substring(0, name.length - 1);
        }
    
        return name;
    }

    private FindModelType(ref: string): any
    {
        //let types: any[] = this._swagger["modelTypes"];
        //let found = null;
        //types.forEach(m => {
        //    if (m["$id"] == ref) {
        //        found = m;
        //    }
        //});
        //return found;

        if (ref == undefined)
            return null;


        return this.FindModel(this._swagger["modelTypes"], ref);
    }

    private FindModel(o: any, id: string): any {
        let found: any = null;
        if(o !== null && typeof o == "object" ) {
            if (o['$id'] == id) {
                found = o;
            } else {
                Object.entries(o).forEach(([key, value]) => {
                    // key is either an array index or object key
                    if (found == null) {
                        found = this.FindModel(value, id);
                    }
                });
            }
        }

        return found;
    }

    private CountProperties(bodyDef: any): number {

        if (bodyDef['$ref'] != undefined) {
            //let newDef = this.FindModelType(bodyDef['$ref']);
            let newDef = this.FindModel(this._swagger["modelTypes"], bodyDef['$ref']);

            if (newDef != null) {
                return this.CountProperties(newDef);
            } else {
                this._log("Counldn't find nodel: " + bodyDef['$ref']);
                return 0;
            }
        }

        let propertiesCount = 0;

        if (bodyDef['baseModelType'] != undefined) {
            propertiesCount += this.CountProperties(bodyDef['baseModelType']);
        }

        if (bodyDef['properties'] == undefined) {
            this._log("Counldn't find properties in model: " /*+ JSON.stringify(bodyDef)*/);
            //this._log(JSON.stringify(bodyDef));
        } else {
            bodyDef['properties'].forEach(element => {
                if (element['extensions'] && element['extensions']['x-ms-client-flatten']) {
                    let submodel = null;
                    
                    if (element['modelType']['$ref'] != undefined) {
                        submodel = this.FindModelType(element['modelType']['$ref']);
                    } else if (element['modelType']['$id'] != undefined){
                       submodel = element['modelType'];
                    }

                    if (submodel != null) {
                        propertiesCount += (this.CountProperties(submodel));
                    } else {
                        this._log("Couldn't find model: " + submodel);
                    }
                } else {                    
                    if (!element['isReadOnly']) {
                        propertiesCount++;
                    }
                }         
            });
        }

        return propertiesCount;
    }
    
    public MethodsTotal: number;
    public MethodsCovered: number;
    public ExamplesTotal: number;
    public ExamplesTested: number;

    private _log: LogCallback;
}
