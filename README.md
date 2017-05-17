# spamjs-datatable
Simple to integrate XML based jquery-datatable with support of 
- server-side pagination 
- custom filters 
- underscore based templating
- user row selection

## General Installation
  
- Install through bower
```
bower install spamjs-datatable
```

- Add dependencies in module.json  
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

- Usage
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

- XML file
```
<data-table>
    <ajax id="ajax" data-url="api to fetch data"
          data-server-side="true">
    </ajax>
    <config id="config" data-sort="true"
            data-paginate="true" data-row-reorder="false"
            data-show-checkbox="true">
    </config>
    <pagination id="pagination" data-page-length="25" 
            data-paging-type="simple"></pagination>
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

- Request format:
```
Action: GET
Request: /test-api?pageNumber=1&pageSize=25&orderBy=updated&sortAscending=false
```

- Response format:
```
{
    content: [],
    pageNumber: 1,
    pageSize: 25,
    totalElements: 75
}
```

## Adding actions
- Basic actions
```
<actions id="actions">
    <action>Test Action 1</action>
    <action>Test Action 2</action>
</actions>
```

- Condition based actions
```
<actions id="actions">
    <!-- if(glob.shipmentsStatus === "qcpending") { -->
    <action>Test Action</action>
    <!-- } -->
    <action>Test Action 1</action>
    <action>Test Action 2</action>
</actions>
```

## Adding filters
- Basic filters: Types of filters available are 
    - checkbox
    - simpleselect
    - multiselect 
    - (default - no type required for simple search)
```
<col title="Column Header" id="testIdRequiredForCol" apply-filter="true">
    <filter filter-type="checkbox">
        <option value="fsa1">Something</option>
        <option value="dsa">Something2</option>
        <option value="Something2">Something3</option>
        <option value="Something4">Something4</option>
    </filter>
    <content>
        TEST CONTENT
    </content>
</col>
```

- Extra filters (via JavaScript)
```
datatable.instance({
    id: "domID",
    configSrc: self.path("somepath.xml"),
    extraFilters: [{
        name: "filterName",
        value: [{
            display: "x",
            value: "x"
        }, {
            display: "y",
            value: "y"
        }],
        title: "Filter Title",
        type: "multiselect"
    }]
});
this.add(instance);
```

- Default filters (via JavaScript)
```
datatable.instance({
    id: "domID",
    configSrc: self.path("somepath.xml"),
    defaultFilters: [{
        name: "filterid",
        value: "testvalue"
    }]
});
this.add(instance);
```

## Updating Request for DataTable
- Use correctPaginationData to change the request object i.e. add/remove new attributes. 
```
datatable.instance({
    id: "domID",
    configSrc: self.path("somepath.xml"),
    defaultFilters: [{
        name: "filterid",
        value: "testvalue"
    }],
    correctPaginationData: function(paginationOptions) {
        paginationOptions.test = "test";
        return paginationOptions;
    }
});
this.add(instance);
``` 

## Formatting data before rendering
- Basic Implementation: Use dataFormatter to change structure of data received in response. 
Add additional attributes or remove attributes as per the requirements and implementation.
```
datatable.instance({
    id: "domID",
    configSrc: self.path("somepath.xml"),
    defaultFilters: [{
        name: "filterid",
        value: "testvalue"
    }],
    dataFormatter: function(data) {
        // Change the structure here
        return paginationOptions;
    }
});
this.add(instance);
```

## Limiting no. of max rows that can be selected
```
<config id="config" 
        data-sort="true" 
        data-paginate="true" 
        data-max-row-select-count="3"
        data-show-actions="true"
        data-row-reorder="false"
        data-show-checkbox="true">
</config>
```
