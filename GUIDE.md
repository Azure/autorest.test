## How to Generate Python Test

    autorest --test --use=@autorest/test@latest --python-integration-test /_/azure-rest-api-specs/specification/storageimportexport/resource-manager/readme.md --output-folder=/_/azure-sdk-for-python

or

    autorest --test --use=. --python-integration-test /_/azure-rest-api-specs/specification/storageimportexport/resource-manager/readme.md --output-folder=/_/azure-sdk-for-python

when executing the source.

When generating the test for the first time, test scenario is not defined, the extension will attempt to create default test scenario, following warnings will be visible in the output:

    WARNING: NO TEST SCENARIO PROVIDED - DEFAULT WILL BE USED
    WARNING: ADD FOLLOWING SECTION TO readme.cli.md FILE TO MODIFY IT
    WARNING: --------------------------------------------------------
    WARNING: cli:
    WARNING:   test:
    WARNING:     - name: /Jobs/put/Create job
    WARNING:     - name: /Jobs/get/Get job
    WARNING:     - name: /Jobs/get/List jobs in a resource group
    WARNING:     - name: /Jobs/get/List jobs in a subscription
    WARNING:     - name: /Locations/get/Get locations
    WARNING:     - name: /Operations/get/List available operations
    WARNING:     - name: /Locations/get/List locations
    WARNING:     - name: /BitLockerKeys/post/List BitLocker Keys for drives in a job
    WARNING:     - name: /Jobs/patch/Update job
    WARNING:     - name: /Jobs/delete/Delete job
    WARNING: --------------------------------------------------------

Test will be generated based on default test scenario, but it's better to add the scenario to **readme.cli.md** file.
This will allow any necessary adjustments to the test flow. 

In addition to test scenario information, there may be warnings related to examples available in swagger, for example:

    WARNING: /Jobs/get/List jobs in a subscription: non-standard resource group name 'testrg', should be 'myResourceGroup'
    WARNING: /Jobs/get/List jobs in a subscription: non-standard resource name 'xtprodtestarmos2', should be 'myStorageAccount'
    WARNING: /Jobs/get/List jobs in a subscription: non-standard resource group name 'testrg', should be 'myResourceGroup'
    WARNING: /Jobs/get/List jobs in a subscription: non-standard resource name 'test-bn1-import-cpu100-01', should be 'myJob'
    WARNING: /Jobs/get/List jobs in a subscription: non-standard resource name 'xtprodtestarmos2', should be 'myStorageAccount'
    WARNING: /Jobs/get/List jobs in a subscription: non-standard resource group name 'testrg', should be 'myResourceGroup'
    WARNING: /Jobs/get/List jobs in a subscription: non-standard resource name 'test-bn1-import-cpu100-02', should be 'myJob'
    WARNING: /Jobs/get/List jobs in a resource group: non-standard resource name 'xtprodtestwu', should be 'myStorageAccount'
    WARNING: /Jobs/get/List jobs in a resource group: non-standard resource name 'test-by1-ssd-2', should be 'myJob'
    WARNING: /Jobs/get/Get job: non-standard resource name 'test', should be 'myStorageAccount'
    WARNING: /Jobs/get/Get job: non-standard resource name 'test', should be 'myJob'
    WARNING: /Jobs/patch/Update job: non-standard resource name 'test', should be 'myStorageAccount'
    WARNING: /Jobs/put/Create job: non-standard resource name 'test', should be 'myStorageAccount'
    WARNING: /Jobs/put/Create job: non-standard resource name 'test', should be 'myStorageAccount'
    WARNING: /Jobs/put/Create job: non-standard resource name 'test', should be 'myStorageAccount'
    WARNING: /Jobs/delete/Delete job: non-standard resource name 'test', should be 'myStorageAccount'
    WARNING: /Jobs/delete/Delete job: non-standard resource name 'test', should be 'myJob'

Last piece of information printed out is test coverage information (this information is also included in test file itself):

    INFO: # TEST SCENARIO COVERAGE
    INFO: # ----------------------
    INFO: # Methods Total   : 10
    INFO: # Methods Covered : 10
    INFO: # Examples Total  : 10
    INFO: # Examples Tested : 10
    INFO: # Coverage %      : 100
    INFO: # ----------------------
