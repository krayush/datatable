# spamjs-datatable
Simple to integrate XML based jquery-datatable with support of server-side pagination, custom filters and underscore based templating

## General Installation
  
  1. Install through bower
```
bower install spamjs-datatable
```
  2. Add dependencies in module.json  
```
{
  	"name": "x/y",
  	"x/y": {
  		"js": [""],
  		"css": ["spamjs/datatable/css"],
  		"on": ["spamjs/datatable"]
  	}
}

```
  3. Usage

```
this.add(datatable.instance({
    id: "domId",
    configSrc: this.path("pathofxmlfile.xml"),
    showCheckbox: true,
    global: {
        test: "test"
    },
    correctPaginationData: function(paginationOptions) {
        paginationOptions.test = true;
        return paginationOptions;
    }
}));
```

4. XML file

```
<data-table>
    <ajax id="ajax"
          data-url="api to fetch data"
          data-server-side="true">
    </ajax>
    <config id="config"
            data-sort="true"
            data-paginate="true"
            data-row-reorder="false"
            data-show-checkbox="true">
    </config>
    <pagination id="pagination" 
            data-page-length="25" 
            data-paging-type="simple"></pagination>
    <actions id="actions">
        <!-- if(glob.shipmentsStatus === "qcpending") { -->
        <action>Test Action</action>
        <!-- } -->
        <action>Test Action 1</action>
        <action>Test Action 2</action>
    </actions>
    <columns>
        <col title="Column Heading">
            <content>Something</content>
        </col>
        <col title="Column Heading 2">
            <content>Something 2</content>
        </col>
    </columns>
</data-table>
```

5. Request format:

```
Action: GET
Request: /test-api?pageNumber=1&pageSize=25&orderBy=updated&sortAscending=false
```

6. Response format:

```
{
    content: [],
    pageNumber: 1,
    pageSize: 25,
    totalElements: 75
}
```
