/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license output.pushrmation.
 *--------------------------------------------------------------------------------------------*/

import { Model } from "../Common/Model";
import { Example, ReferenceType, ExampleWarning, ExampleVariable } from "../Common/Example";
import { Indent, ToSnakeCase } from "../Common/Helpers";
import { type } from "os";

export function GeneratePythonIntegrationTest(model: Model) : string[] {

    // get references from all examples
    let refs: ReferenceType[] = [];
    model.examples.forEach(e => {
        e.ReferenceTypes.forEach(r => {
            if (refs.indexOf(r) < 0) {
                refs.push(r);
            }
        });
    });

    // get variables from all examples
    let vars: ExampleVariable[] = model.getVars();

    var output: string[] = [];

    let className: string = "Mgmt" + model.mgmtClientName.split("ManagementClient")[0] + "Test";
    let testName: string = "test_" + model.cliCommandName.replace(/-/g, '_');

    output.push("# coding: utf-8");
    output.push("");
    output.push("#-------------------------------------------------------------------------");
    output.push("# Copyright (c) Microsoft Corporation. All rights reserved.");
    output.push("# Licensed under the MIT License. See License.txt in the project root for");
    output.push("# license information.");
    output.push("#--------------------------------------------------------------------------");
    output.push("");

    output.push("");
    output.push("# TEST SCENARIO COVERAGE");
    output.push("# ----------------------");
    output.push("# Methods Total   : " + model.methodsTotal);
    output.push("# Methods Covered : " + model.methodsCovered);
    output.push("# Examples Total  : " + model.examplesTotal);
    output.push("# Examples Tested : " + model.examplesTested);
    output.push("# Coverage %      : " +  ((model.methodsCovered / model.methodsTotal) * (model.examplesTested / model.examplesTotal) * 100).toFixed());
    output.push("# ----------------------");
    output.push("");

    output.push("import unittest");
    output.push("");
    // XXX - proper namespace
    output.push("import " + model.namespace);

    let hasStorageAccountPreparer: boolean = (refs.indexOf(ReferenceType.STORAGE) >= 0);
    let needSubscriptionId: boolean = false;
    let preparers = ", ResourceGroupPreparer";
    if (hasStorageAccountPreparer)
    {
        preparers += ", StorageAccountPreparer";
        needSubscriptionId = true;
    }

    output.push("from devtools_testutils import AzureMgmtTestCase" + preparers);

    output.push("");
    output.push("AZURE_LOCATION = 'eastus'");
    output.push("");
    output.push("class " + className + "(AzureMgmtTestCase):");
    output.push("");
    output.push("    def setUp(self):");
    output.push("        super(" + className + ", self).setUp()");
    output.push("        self.mgmt_client = self.create_mgmt_client(");
    output.push("            " + model.namespace + "." + model.mgmtClientName);
    output.push("        )");
    output.push("    ");

    if (model.needCompute() ||
        model.needKeyvault() ||
        model.needNetwork() ||
        model.needStorage()) {

        output.push("");
        output.push("        if self.is_live:");

        if (model.needCompute()) {
            output.push("            from azure.mgmt.compute import ComputeManagementClient");
            output.push("            self.compute_client = self.create_mgmt_client(");
            output.push("                ComputeManagementClient");
            output.push("            )");
        }
        if (model.needNetwork()) {
            output.push("            from azure.mgmt.network import NetworkManagementClient");
            output.push("            self.network_client = self.create_mgmt_client(");
            output.push("                NetworkManagementClient");
            output.push("            )");
        }
        if (model.needStorage()) {
            output.push("            from azure.mgmt.storage import StorageManagementClient");
            output.push("            self.storage_client = self.create_mgmt_client(");
            output.push("                StorageManagementClient");
            output.push("            )");
        }
        if (model.needKeyvault()) {
            output.push("            from azure.mgmt.storage import KeyvaultManagementClient");
            output.push("            self.keyvault_client = self.create_mgmt_client(");
            output.push("                KeyvaultManagementClient");
            output.push("            )");
        }
    }

    if (model.needVirtualNetwork()) {
        output.push("        def create_virtual_network(self, group_name, location, network_name, subnet_name):");
        output.push("");
        output.push("        azure_operation_poller = self.network_client.virtual_networks.create_or_update(");
        output.push("            group_name,");
        output.push("            network_name,");
        output.push("            {");
        output.push("                'location': location,");
        output.push("                'address_space': {");
        output.push("                    'address_prefixes': ['10.0.0.0/16']");
        output.push("                }");
        output.push("            },");
        output.push("        )");
        output.push("        result_create = azure_operation_poller.result()");
        output.push("");
        output.push("        async_subnet_creation = self.network_client.subnets.create_or_update(");
        output.push("            group_name,");
        output.push("            network_name,");
        output.push("            subnet_name,");
        output.push("            {'address_prefix': '10.0.0.0/24'}");
        output.push("        )");
        output.push("        subnet_info = async_subnet_creation.result()");
        output.push("");
        output.push("        return subnet_info");
    }

    if (model.needNetworkInterface()) {
        output.push("        def create_network_interface(self, group_name, location, nic_name, subnet_id):");
        output.push("        async_nic_creation = self.network_client.network_interfaces.create_or_update(");
        output.push("            group_name,");
        output.push("            nic_name,");
        output.push("            {");
        output.push("                'location': location,");
        output.push("                'ip_configurations': [{");
        output.push("                    'name': 'MyIpConfig',");
        output.push("                    'subnet': {");
        output.push("                        'id': subnet_id");
        output.push("                    }");
        output.push("                }]");
        output.push("            }");
        output.push("        )");
        output.push("        nic_info = async_nic_creation.result()");
        output.push("        return nic_info.id");
    }

    if (model.needVirtualMachine()) {
        output.push("        def create_vm(self, group_name, location, vm_name, nic_id):");
        output.push("        # Create a vm with empty data disks.[put]");
        output.push("        BODY = {");
        output.push("          \"location\": location,");
        output.push("          \"hardware_profile\": {");
        output.push("            \"vm_size\": \"Standard_D2_v2\"");
        output.push("          },");
        output.push("          \"storage_profile\": {");
        output.push("            \"image_reference\": {");
        output.push("              \"sku\": \"enterprise\",");
        output.push("              \"publisher\": \"microsoftsqlserver\",");
        output.push("              \"version\": \"latest\",");
        output.push("              \"offer\": \"sql2019-ws2019\"");
        output.push("            },");
        output.push("            \"os_disk\": {");
        output.push("              \"caching\": \"ReadWrite\",");
        output.push("              \"managed_disk\": {");
        output.push("                \"storage_account_type\": \"Standard_LRS\"");
        output.push("              },");
        output.push("              \"name\": \"myVMosdisk\",");
        output.push("              \"create_option\": \"FromImage\"");
        output.push("            },");
        output.push("            \"data_disks\": [");
        output.push("              {");
        output.push("                \"disk_size_gb\": \"1023\",");
        output.push("                \"create_option\": \"Empty\",");
        output.push("                \"lun\": \"0\"");
        output.push("              },");
        output.push("              {");
        output.push("                \"disk_size_gb\": \"1023\",");
        output.push("                \"create_option\": \"Empty\",");
        output.push("                \"lun\": \"1\"");
        output.push("              }");
        output.push("            ]");
        output.push("          },");
        output.push("          \"os_profile\": {");
        output.push("            \"admin_username\": \"testuser\",");
        output.push("            \"admin_password\": \"Password1!!!\",");
        output.push("            \"computer_name\" : \"myvm\"");
        output.push("          },");
        output.push("          \"network_profile\": {");
        output.push("            \"network_interfaces\": [");
        output.push("              {");
        output.push("                # \"id\": \"/subscriptions/\" + SUBSCRIPTION_ID + \"/resourceGroups/\" + RESOURCE_GROUP + \"/providers/Microsoft.Network/networkInterfaces/\" + NIC_ID + \"\",");
        output.push("                \"id\": nic_id,");
        output.push("                \"properties\": {");
        output.push("                  \"primary\": True");
        output.push("                }");
        output.push("              }");
        output.push("            ]");
        output.push("          }");
        output.push("        }");
        output.push("        result = self.compute_client.virtual_machines.create_or_update(group_name, vm_name, BODY)");
        output.push("        result = result.result()");
    }

    if (model.needStorage()) {
        output.push("        def create_storage_account(self, group_name, location, storage_name):");
        output.push("        BODY = {");
        output.push("          \"sku\": {");
        output.push("            \"name\": \"Standard_GRS\"");
        output.push("          },");
        output.push("          \"kind\": \"StorageV2\",");
        output.push("          \"location\": AZURE_LOCATION,");
        output.push("          \"encryption\": {");
        output.push("            \"services\": {");
        output.push("              \"file\": {");
        output.push("                \"key_type\": \"Account\",");
        output.push("                \"enabled\": True");
        output.push("              },");
        output.push("              \"blob\": {");
        output.push("                \"key_type\": \"Account\",");
        output.push("                \"enabled\": True");
        output.push("              }");
        output.push("            },");
        output.push("            \"key_source\": \"Microsoft.Storage\"");
        output.push("          }");
        output.push("        }");
        output.push("        result_create = self.storage_client.storage_accounts.create(");
        output.push("            group_name,");
        output.push("            storage_name,");
        output.push("            BODY");
        output.push("        )");
        output.push("        result = result_create.result()");
        output.push("        print(result)");
        output.push("");
        output.push("    def get_storage_key(self, group_name, storage_name):");
        output.push("        result = self.storage_client.storage_accounts.list_keys(group_name, storage_name)");
        output.push("        print(result)");
        output.push("        return result.keys[0].value");
    }

    output.push("    @ResourceGroupPreparer(location=AZURE_LOCATION)");

    let preparersParamList: string = ", resource_group";
    if (hasStorageAccountPreparer)
    {
        output.push("    @StorageAccountPreparer(location=AZURE_LOCATION, name_prefix='gentest')");
        preparersParamList += ", storage_account";
    }

    output.push("    def " + testName + "(self" + preparersParamList + "):");
    //output.push("        account_name = self.get_resource_name('pyarmcdn')");
    output.push("");

    if (model.haveUnique()) {
        output.push("        UNIQUE = resource_group.name[-4:]");
    }
    //if (needSubscriptionId)
    //{
        output.push("        SUBSCRIPTION_ID = self.settings.SUBSCRIPTION_ID");
        output.push("        TENANT_ID = self.settings.TENANT_ID");
    //}
    output.push("        RESOURCE_GROUP = resource_group.name");

    vars.forEach(v => {
        if (v.name != "resource_group" && v.name != "azure_location") {
            output.push("        " + v.name.toUpperCase() + " = \"" + v.value + "\"" + (v.unique ? " + UNIQUE" : ""));
        }
    });

    if (hasStorageAccountPreparer)
    {
        output.push("        STORAGE_ACCOUNT_NAME = storage_account.name");
    }
    
    for (var ci = 0; ci < model.config.length; ci++)
    {
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
            continue;

        let hasBody: boolean = (example.GetExampleBodyName() != null);

        output.push("");

        if (model.config[ci]['comment'] != null) {
            output.push("        # " + model.config[ci]['comment']);
        }

        output.push("        # " + example.Id + "[" + example.Method + "]");

        if (hasBody)
        {
            if (!example.FlattenBody) {
                var json: string[] = GetExampleBodyJson(_PythonizeBody(example.GetExampleBody()));
                for (let line of json)
                {
                    if (line.startsWith("{"))
                    {
                        output.push("        BODY = " + line);
                    }
                    else
                    {
                        output.push("        " + line);
                    }
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
                                output.push("        " + ToSnakeCase(k).toUpperCase() +  " = " + line);
                            }
                            else
                            {
                                output.push("        " + line);
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
                        clientParams += ToSnakeCase(k) + "= " + ToSnakeCase(k).toUpperCase();
                    } else {
                        clientParams += ToSnakeCase(k) + "=\"" + body[k] + "\"";
                    }
                }
            } else {
                if (clientParams != "") clientParams += ", ";
                clientParams += ToSnakeCase(example.GetExampleBodyName()) + "=BODY";
            }
        }

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

        output.push("        " + disabled + "result = self.mgmt_client." +
                    ((ToSnakeCase(example.OperationName) != "") ? (ToSnakeCase(example.OperationName) + ".") : "") +
                    ((example.LongRunning && model.track2) ? "begin_" : "") + 
                    ToSnakeCase(example.MethodName) +
                                         "(" + clientParams + ")");
        if (example.LongRunning)
        {
            output.push("        " + disabled + "result = result.result()");
        }
    }

    output.push("");
    output.push("");
    output.push("#------------------------------------------------------------------------------");
    output.push("if __name__ == '__main__':");
    output.push("    unittest.main()");
    output.push("");  // python pep8: need a blank line in the end.

    return output;
}

function GetExampleBodyJson(body: any): string[]
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

function _ReplaceVariables(l: string) : string {
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

function _UrlToParameters(sourceUrl: string): string
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

function _PythonizeBody(body: any): any
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

