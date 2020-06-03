/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license output.pushrmation.
 *--------------------------------------------------------------------------------------------*/

import { Model } from "../Common/Model";
import { Example, ReferenceType, ExampleWarning, ExampleVariable } from "../Common/Example";
import { Indent, ToSnakeCase } from "../Common/Helpers";
import { type } from "os";
import { GetExampleBodyJson, _PythonizeBody, _UrlToParameters, _ReplaceVariables, AddVariables, AppendExample } from "./TemplatePythonCommon";

export function GeneratePythonExample(model: Model) : string[] {

    // get references from all examples
    let refs: ReferenceType[] = [];
    model.examples.forEach(e => {
        e.ReferenceTypes.forEach(r => {
            if (refs.indexOf(r) < 0) {
                refs.push(r);
            }
        });
    });

    var output: string[] = [];

    output.push("#-------------------------------------------------------------------------");
    output.push("# Copyright (c) Microsoft Corporation. All rights reserved.");
    output.push("# Licensed under the MIT License. See License.txt in the project root for");
    output.push("# license information.");
    output.push("#--------------------------------------------------------------------------");
    output.push("");

    output.push("import os")
    output.push("from " + model.namespace + " import " + model.mgmtClientName);

    if (model.needResourceGroup()) {
        output.push("from azure.mgmt.resource import ResourceManagementClient");
    }

    output.push("from azure.common.credentials import ServicePrincipalCredentials");

    let hasStorageAccountPreparer: boolean = (refs.indexOf(ReferenceType.STORAGE) >= 0);
    let needSubscriptionId: boolean = false;

    output.push("");
    output.push("");
    
    output.push("#--------------------------------------------------------------------------");
    output.push("# credentials from environment");
    output.push("#--------------------------------------------------------------------------");
    output.push("SUBSCRIPTION_ID = os.environ['AZURE_SUBSCRIPTION_ID']");
    output.push("TENANT_ID = os.environ['AZURE_TENANT']");
    output.push("CLIENT_ID = os.environ['AZURE_CLIENT_ID']");
    output.push("CLIENT_SECRET = os.environ['AZURE_SECRET']");
    output.push("");
    output.push("");
    
    output.push("#--------------------------------------------------------------------------");
    output.push("# variables");
    output.push("#--------------------------------------------------------------------------");


    // add all the variables used in the example
    output.push("AZURE_LOCATION = 'eastus'");

    //if (model.needResourceGroup()) {
    //    output.push("RESOURCE_GROUP = \"myResourceGroup\"");
    //}

    if (model.haveUnique()) {
        output.push("UNIQUE = resource_group.name[-4:]");
    }
    AddVariables(model, "", output);
    output.push("");
    output.push("");

    // XXX - only track1
    output.push("#--------------------------------------------------------------------------");
    output.push("# management clients");
    output.push("#--------------------------------------------------------------------------");
    output.push("credentials = ServicePrincipalCredentials(");
    output.push("    client_id=CLIENT_ID,");
    output.push("    secret=CLIENT_SECRET,");
    output.push("    tenant=TENANT_ID");
    output.push(")");
    
    output.push("mgmt_client = " + model.mgmtClientName + "(credentials, SUBSCRIPTION_ID)");

    if (model.needResourceGroup()) {
        output.push("resource_client = ResourceManagementClient(credentials, SUBSCRIPTION_ID)");
    }

    if (model.needCompute() ||
        model.needKeyvault() ||
        model.needNetwork() ||
        model.needStorage()) {

        if (model.needCompute()) {
            output.push("from azure.mgmt.compute import ComputeManagementClient");
            output.push("compute_client = ComputeManagementClient(credentials, SUBSCRIPTION_ID)");
        }
        if (model.needNetwork()) {
            output.push("from azure.mgmt.network import NetworkManagementClient");
            output.push("network_client = NetworkManagementClient(credentials, SUBSCRIPTION_ID)");
        }
        if (model.needStorage()) {
            output.push("from azure.mgmt.storage import StorageManagementClient");
            output.push("storage_client = StorageManagementClient(credentials, SUBSCRIPTION_ID)");
        }
        if (model.needKeyvault()) {
            output.push("from azure.mgmt.keyvault import KeyvaultManagementClient");
            output.push("keyvault_client = KeyvaultManagementClient(credentials, SUBSCRIPTION_ID)");
        }
    }

    if (model.needResourceGroup()) {
        output.push("");
        output.push("");
        output.push("#--------------------------------------------------------------------------");
        output.push("# resource group (prerequisite)");
        output.push("#--------------------------------------------------------------------------");
        output.push("print(\"Creating Resource Group\")");
        output.push("resource_client.resource_groups.create_or_update(resource_group_name=RESOURCE_GROUP, parameters={ 'location': AZURE_LOCATION })");
        }
    
    if (model.needVirtualNetwork()) {
        output.push("");
        output.push("");
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
        output.push("");
        output.push("");
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
        output.push("");
        output.push("");
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
        output.push("");
        output.push("");
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

    for (var ci = 0; ci < model.config.length; ci++)
    {
        output.push("");
        output.push("");
        AppendExample(model, "", ci, output, false);
    }

    output.push("");

    return output;
}
