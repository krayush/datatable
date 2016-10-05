define({
    name: "spamjs.datatable",
    extend: "spamjs.view",
    modules: ["jsutils.server", "jQuery", "jsutils.file", "jsutils.tmpl"]
}).as(function(dataTableLoader, utilServer, jq, jsfile, tmplUtil) {
    return {
        events: {
            "click .datatable-row": "datatableRowClick",
            "change .grid-actions": "gridActionSelected",
            "change .datatable-row input[type='checkbox']": "rowSelectionChanged",
            "click input[type='checkbox'].select-all": "selectAllRows",
            "grid-init-complete": "bindFilterEvent"
        },
        // override this in your project to provide custom server
        getServer: function() {
            return utilServer;
        },
        // override this in your project to get i18n for titles
        i18n: function(data) {
            return data;
        },
        bindFilterEvent: function() {
            var self = this;
            self.$$.find(".filter-container").click(function(e) {
                if(jq(e.target).hasClass("filter-icon")) {
                    self.generateFilterModal(e);
                }
                // handling bubble event for apply filter manually
                if(!jq(e.target).hasClass("apply-filter")) {
                    e.stopPropagation();
                }
            });
            self.$$.find(".filter-container").on("click", '.apply-filter', function(e) {
                self.applyFilter(e);
            });
        },
        applyFilter: function(e) {
            var self = this;
            var parent = jq(e.target).parent(".filter-section");
            var filterType = jq(e.target).attr("filter-type");
            var filterId = jq(e.target).attr("filter-id");
            _.each(self.appliedFilters, function(item, index) {
                if(item && (item.name === filterId)) {
                    self.appliedFilters.splice(index, 1);
                }
            });
            switch(filterType) {
                case "multiselect":
                    var select = parent.find("select");
                    if(select.val()) {
                        self.appliedFilters.push({
                            name: filterId,
                            value: select.val()
                        });
                    }
                    break;
                case "checkbox":
                    var checkboxes = parent.find("input[type='checkbox']");
                    var value = [];
                    _.each(checkboxes, function(item) {
                        if(item.checked) {
                            value.push(item.value);
                        }
                    });
                    if(value.length) {
                        self.appliedFilters.push({
                            name: filterId,
                            value: value
                        });
                    }
                    break;
                default:
                    var element = parent.find("input[type='text']");
                    if(element.val()) {
                        self.appliedFilters.push({
                            name: filterId,
                            value: element.val()
                        });
                    }
                    break;
            }
            self.draw();
            e.stopPropagation();
        },
        // Showing the applied filter types in DOM
        showAppliedFilterValues: function(filterId, filterType) {
            var self = this;
            var parent = self.$$.find(".filter-section");
            var currentFilteredValue;
            _.each(self.appliedFilters, function(item, index) {
                if(item && (item.name === filterId)) {
                    currentFilteredValue = item.value;
                }
            });
            if(currentFilteredValue) {
                switch(filterType) {
                    case "multiselect":
                        parent.find("select").val(currentFilteredValue);
                        break;
                    case "checkbox":
                        var checkboxes = parent.find("input[type='checkbox']");
                        _.each(checkboxes, function(item) {
                            if(currentFilteredValue.indexOf(item.value) > -1) {
                                item.checked = true;
                            }
                        });
                        break;
                    default:
                        parent.find("input[type='text']").val(currentFilteredValue);
                        break;
                }
            }
        },
        closeFilterSection: function() {
            var self = this;
            if(this.$popover) {
                this.$popover.popover("destroy");
                this.$$.find(".filter-open").removeClass("filter-open");
                this.$popover = null;
            }
        },
        generateFilterModal: function(e) {
            var self = this;
            var filterId = e.currentTarget.getAttribute("filter-id");
            // Close the previous popover in all the cases
            self.closeFilterSection();
            // If a new fitler icon is clicked
            if(self.currentOpenFilter !== filterId) {
                self.currentOpenFilter = filterId;
                var element = jq("<span></span>");
                jq(e.target).after(element);
                var filterConfig = self.filterConfig[filterId];
                if(filterId && filterConfig && !jq(e.currentTarget).hasClass("filter-open")) {
                    jq(e.currentTarget).addClass("filter-open");
                    self.$popover = element.popover({
                        trigger: "hover",
                        html: true,
                        placement: "bottom",
                        // rendering content depending on the type of filter
                        content: function() {
                            var filterContainer = jq("<div class='filter-section'>");
                            filterContainer.append("<div class='filter-title'>"+filterConfig.title+"</div>");
                            switch(filterConfig.type) {
                                case "multiselect":
                                    element = jq("<select multiple='multiple'></select");
                                    _.each(filterConfig.data, function(data) {
                                        element.append("<option value='" + data.value + "'>" + data.display + "</option>");
                                    });
                                    break;
                                case "checkbox":
                                    element = jq("<div class='checkbox-filter-section'></div>");
                                    _.each(filterConfig.data, function(data, index) {
                                        element.append(
                                            "<div class='checkbox-filter-row'>\
                                                <input type='checkbox' id='" + (filterId + index) + "' name='" + filterId + "' value='" + data.value + "' />\
                                                <label for='" + (filterId + index) + "'>" + data.display + "</label>\
                                            </div>"
                                        );
                                    });
                                    break;
                                default: 
                                    element = jq("<input type='text'/>");
                                    break;
                            }
                            filterContainer.append(element);
                            filterContainer.append("<button class='apply-filter' \
                                filter-type='" + filterConfig.type + "' \
                                filter-id='" + filterId + "' >APPLY</button>");
                            filterContainer.append(jq("<div class='clear'>"));
                            return filterContainer[0].outerHTML;
                        }
                    }).popover('show');
                    self.showAppliedFilterValues(filterId, filterConfig.type);
                }
            } else {
                self.currentOpenFilter = null;
            }
        },
        _init_: function(config) {
            var self = this;
            self.rowsSelected = [];
            self.appliedFilters = [];
            var tableConfig = {
                data: [],
                columns: [],
                apiMethod: "get",
                columnDefs: [],
                global: {},
                scrollY: "200px",
                dom: "Rfrtlip",
                // for show/hide "Available Actions" in the grid actions
                showActionTitle: true,
                info: false,
                pathParams: {},
                defaultFilters: [],
                scrollX: true,
                defaultColumnWidth: "160px",
                actionsList: [],
                // showCheckbox && rowReorder are not supported together
                showCheckbox: false,
                rowReorder: false,
                dataFormatter: function(data) {
                    return data;
                },
                integrateFilters: function(url, paginateOptions, appliedFilters) {
                    _.each(appliedFilters, function(item) {
                        if(typeof item.value === "string") {
                            paginateOptions[item.name] = item.value;
                        } else {
                            paginateOptions[item.name] = item.value.join(",");
                        }
                    });
                    return {
                        url: url,
                        paginateOptions: paginateOptions
                    };
                },
                createdRow: function (row, data, index) {
                    jq(row).addClass("datatable-row");
                },
                // required as self.gridInstance.draw() does not return a promise
                drawCallback: function() {
                    self.trigger("grid-draw-completed");
                },
                correctPaginationData: function(paginateOptions) { return paginateOptions;},
                initComplete: function() { 
                    if(!self.resizeDatatable) {
                        self.resizeDatatable = self.getResize();
                    }
                    self.resizeDatatable();
                    if(self.tableConfig.paginate) {
                        self.$$.find("#gridContainer_wrapper").addClass("paginated-grid");
                    }
                    self.$$.find("#gridContainer_wrapper").animate({opacity: 1});
                    self.trigger("grid-init-complete");
                },
                // need to trigger a event on row selection change
                actionsFormatter: self.actionsFormatter
            };
            self.tableConfig = jq.extend(tableConfig, config);
            return jsfile.getXML(config.configSrc).then(function(resp) {
                self.$$.append('<table id="gridContainer"></table>');
                self.gridContainer = self.$$.find("#datatableContainer");
                self.jqfile = jq(resp);
                self.generateTableConfig();
                // This way we will override everything in JS code
                self.tableConfig = jq.extend(self.tableConfig, config);
                // Setting filters as 
                self.appliedFilters = self.tableConfig.defaultFilters || [];
                self.configureAjax();
                self.generateColumnsConfig();
                self.generateActionsConfig();
                self.gridElement = self.$$.find("#gridContainer");
                return jq.when(self.getGridData()).done(function() {
                    self.gridInstance = self.gridElement.DataTable(self.tableConfig);
                    self.bindExternalSearch();
                    self.bindRowReorder();
                    // configuring rendering of grid on resizing
                    jq(window).resize(self.getResizeTasks());
                    // configuring closing of filters section on click anywhere
                    jq("body").click(function() {
                        self.closeFilterSection();
                        self.currentOpenFilter = null;
                    });
                    if (self.tableConfig.showCheckbox) {
                        self.$$.find(".dataTables_scroll").addClass("checkbox-enabled");
                    }
                    if (self.tableConfig.rowReorder) {
                        self.$$.find(".dataTables_scroll").addClass("reorder-enabled");
                    }
                    self.configureGridActions();
                }).always(function() {
                    self.$$.find("spinner").remove();
                });
            });
        },
        // Tasks to be performed when window resize happens
        getResizeTasks: function() {
            var self = this;
            if(self.resizeTasks) {
                jq(window).off("resize", self.resizeTasks);
            }
            self.resizeTasks = function() {
                self.resizeDatatable();
                self.closeFilterSection();
                self.currentOpenFilter = null;
            };
            return self.resizeTasks;
        },
        // fetches data only in case of client side grid
        getGridData: function() {
            var self = this;
            if (!self.tableConfig.url) {
                return self.tableConfig.data;
            }
            if (!self.tableConfig.serverSide) {
                var paginateOptions = self.tableConfig.correctPaginationData({});
                self.$$.append("<spinner mid-spinner></spinner>");
                return self.getServer()[self.tableConfig.apiMethod](
                    self.tableConfig.url,
                    paginateOptions,
                    self.tableConfig.pathParams
                ).done(function(resp) {
                    self.tableConfig.data = resp;
                });
            }
        },
        configureGridActions: function() {
            var self = this;
            var actionsList = self.tableConfig.actionsList;
            self.$$.find(".dataTables_scrollHead").append('<select class="grid-actions"></select>');
            if (actionsList.length) {
                if(self.tableConfig.showActionTitle) {
                    self.$$.find(".grid-actions").append('<option selected="selected" disabled="disabled" value="">Available Actions</option>');
                } else {
                    self.$$.find(".grid-actions").append('<option selected="selected" disabled="disabled" value="">'+actionsList[0].key+'</option>');
                }
                _.each(actionsList, function(item, index) {
                    if(self.tableConfig.showActionTitle || index !== 0) {
                        self.$$.find(".grid-actions").append(
                            '<option '+ (item.disabled ? 'disabled': '') +' value="' + item.key + '">' + item.key + '</option>'
                        );
                    }
                });
            }
            self.$$.find(".grid-actions").hide();
        },
        bindExternalSearch: function() {
            var self = this;
            if (self.tableConfig.searchElement) {
                self.tableConfig.searchElement.keyup(function(e, element) {
                    self.gridInstance.search(jq(element).val()).draw();
                });
            }
        },
        bindRowReorder: function() {
            var self = this;
            if (self.tableConfig.rowReorder) {
                self.gridInstance.on('row-reorder', function(e, diff, edit) {
                    var reorderedData = [], originalData = self.getData();
                    _.each(diff, function(row) {
                        reorderedData[row.newPosition] = originalData[row.oldPosition];
                    });
                    _.each(originalData, function(row, index) {
                        if (!reorderedData[index]) {
                            reorderedData[index] = row;
                        }
                    });
                    self.trigger("row-reorder", {
                        original: originalData,
                        reorderedData: reorderedData,
                        edit: edit
                    });
                });
            }
        },
        gridActionSelected: function(e, element) {
            var self = this;
            self.trigger("grid-action-selected", {
                option: jq(element).val(),
                rows: self.rowsSelected
            });
            jq(element).val("");
        },
        actionsFormatter: function(rows) {
            var self = this;
            if (self.tableConfig.actionsList.length) {
                self.$$.find(".grid-actions").css("display",
                    rows.length ? "block": "none"
                );
            }
        },
        generateActionsConfig: function() {
            var self = this;
            // compiling the action nodes using the data from the config
            var actionNodes = self.jqfile.find("#actions");
            if(actionNodes.length) {
                var actionNodesContent = tmplUtil.compile(actionNodes[0].outerHTML, {
                    variable : ""
                })({
                    glob: self.tableConfig.global
                });
                var actions = jq(actionNodesContent).children();
                _.each(actions, function(element) {
                    self.tableConfig.actionsList.push({
                        disabled: element.getAttribute("disabled"),
                        key: element.innerHTML
                    });
                });
            }
        },
        generateTableConfig: function() {
            var self = this;
            self.tableConfig = jq.extend(self.tableConfig, self.jqfile.find("#config").data());
            self.tableConfig = jq.extend(self.tableConfig, self.jqfile.find("#pagination").data());
            self.tableConfig = jq.extend(self.tableConfig, self.jqfile.find("#ajax").data());
            // pagination: 50 & header: 40
            self.tableConfig.scrollY = this.$$.parent().height() - 40 - (this.tableConfig.paginate * 50);
        },
        configureAjax: function() {
            var self = this;
            // configure ajax
            if (self.tableConfig.serverSide) {
                self.tableConfig.ajax = function(data, callback, settings) {
                    if(!self.resizeDatatable) {
                        self.resizeDatatable = self.getResize();
                    }
                    self.resizeDatatable();
                    self.rowsSelected = [];
                    if(self.$popover) {
                        self.$popover.popover("destroy");
                        self.$$.find(".filter-open").removeClass("filter-open");
                        self.$popover = null;
                        self.currentOpenFilter = null;
                    }
                    return self.configurePagination.apply(self, arguments);
                }
            }
        },
        generateFiltersConfig: function(columns, index) {
            var self = this;
            var content = jq(columns[index]).find("content").html();
            var filterElement = jq(columns[index]).find("filter");
            var elementId = jq(columns[index]).attr("id");
            if(filterElement.length) {
                if(elementId) {
                    var compiledElement = jq(tmplUtil.compile(filterElement[0].outerHTML, {
                        variable : ""
                    })({
                        glob: self.tableConfig.global
                    }))[0];
                    var options = jq(compiledElement).find("option");
                    self.filterConfig[elementId] = {
                        type: filterElement.attr("filter-type"),
                        title: jq(columns[index]).attr("title"),
                        data: []
                    };
                    _.each(options, function(option) {
                        self.filterConfig[elementId].data.push({
                            value: option.innerHTML,
                            display: option.getAttribute("value")
                        });
                    });
                } else {
                    console.error("Id required for the filter missing");
                }
            }
        },
        generateColumnsConfig: function() {
            var self = this;
            var columns = self.jqfile.find("col");
            var checkboxColumn = self.jqfile.find("checkbox-col");
            if(self.tableConfig.rowReorder) {
                self.tableConfig.columns.push({
                    type: "html",
                    title: '&nbsp;',
                    className: "dt-head-center reorder-col",
                    orderable: false,
                    render: function(data, type, full, meta) {
                        return '<span grab><i class="icon icon_vertical_dots"></i></span>';
                    }
                });
            }
            if(self.tableConfig.showCheckbox) {
                // if dummy template for the checkbox column is available
                if(checkboxColumn.length) {
                    self.checkboxConfig = {
                        title: self.i18n(jq(checkboxColumn).find("title").html()) || "&nbsp;",
                        className: jq(checkboxColumn).attr("class") || "dt-head-center checkbox-col",
                        html: jq(checkboxColumn).find("row").html()
                    };
                }
                self.tableConfig.columns.push(jq.extend({
                    type: "html",
                    title: '<input type="checkbox" class="select-all" />',
                    className: "dt-head-center checkbox-col",
                    orderable: false,
                    html: '<input type="checkbox" class="row-checkbox"/>'
                }, self.checkboxConfig));
                // +self.tableConfig.rowReorder will give 1 in case of row-reordering enabled
                self.tableConfig.columns[+self.tableConfig.rowReorder].render = function(data, type, full, meta) {
                    return tmplUtil.compile(self.tableConfig.columns[+self.tableConfig.rowReorder].html, {
                        variable : ""
                    })({
                        data: full, 
                        glob: self.tableConfig.global
                    });
                };
            }
            self.filterConfig = {};
            for(var i = 0; i < columns.length; i++) {
                // cloning the element to compile the header otherwise it overwrites the original element
                var clone = jq(columns[i]).clone().html("");
                var compiledElement = jq(tmplUtil.compile(clone[0].outerHTML, {
                    variable : ""
                })({
                    glob: self.tableConfig.global
                }))[0];
                var customDiv = jq("<div class='title-container'>");
                var customTitle = jq("<div class='title-text'>");
                customTitle.html(self.i18n(columns[i].getAttribute("title")) || "&nbsp;");
                customTitle.append('<i class="fa fa-arrow-down"></i>');
                customTitle.append('<i class="fa fa-arrow-up"></i>');
                customDiv.append(customTitle[0].outerHTML);
                var applyFilters = columns[i].getAttribute("apply-filter") === "true";
                // Filters are only applicable in case of serverside grids
                if(applyFilters && self.tableConfig.serverSide) {
                    customDiv.append('<div class="filter-container"><i class="fa fa-filter filter-icon" aria-hidden="true">&nbsp;</i></div>');
                    customDiv.find(".filter-container").attr("filter-id", columns[i].getAttribute("id"));
                }
                var content = jq(columns[i]).find("content").html();
                self.tableConfig.columns.push({
                    type: "html",
                    key: columns[i].getAttribute("key"),
                    // as getAttribute returns a string and not a boolean
                    visible: compiledElement.hasAttribute("hidden") ? compiledElement.getAttribute("hidden") === "false" : true,
                    title: customDiv[0].outerHTML,
                    className: columns[i].getAttribute("class") || "dt-head-left",
                    orderable: columns[i].getAttribute("sort") === "true",
                    width: columns[i].getAttribute("width") || self.tableConfig.defaultColumnWidth,
                    render: (function(index) {
                        var compile = tmplUtil.compile(content,{ variable : ""});
                        return function(data, type, full, meta) {
                            return compile({data: full, glob: self.tableConfig.global}).trim() || "-";
                        }
                    })(i)
                });
                self.generateFiltersConfig(columns, i);
                if(columns[i].getAttribute("presort")) {
                    self.tableConfig.order = [
                        [
                            i + (+self.tableConfig.showCheckbox) + (+self.tableConfig.rowReorder),
                            columns[i].getAttribute("presort-direction") || "asc"
                        ]
                    ]
                }
            }
            console.error(self.filterConfig);
        },
        configurePagination: function(data, callback) {
            var self = this;
            var paginateOptions = {
                pageNumber: (data.start / data.length + 1),
                pageSize: data.length
            };
            if (data.order.length) {
                // FYI: Current datatable supports either row reodering or checkbox
                var orderIndex = data.order[0].column;
                paginateOptions.orderBy = self.tableConfig.columns[orderIndex].key;
                paginateOptions.sortAscending = (data.order[0].dir === "asc");
            }
            // editing params required before datatable fetches data
            paginateOptions = self.tableConfig.correctPaginationData(paginateOptions);
            self.$$.append("<spinner mid-spinner></spinner>");
            // config here is an object which will contain url and paginateOptions
            var config = self.tableConfig.integrateFilters(
                self.tableConfig.url, 
                paginateOptions, 
                self.appliedFilters
            );
            self.getServer()[self.tableConfig.apiMethod](
                config.url, 
                config.paginateOptions, 
                self.tableConfig.pathParams
            ).done(function(resp) {
                // formatting data before passing it to grid - only use if required
                resp = self.tableConfig.dataFormatter(resp);
                // clearing previous selection
                self.rowsSelected = [];
                callback({
                    data: resp.content,
                    recordsTotal: resp.totalElements,
                    recordsFiltered: resp.totalElements,
                    draw: data.draw
                });
                // recalculating widths for the columns on redrawing
                self.gridInstance.columns.adjust();
                if(self.tableConfig.showCheckbox) {
                    self.calculateSelectionChanged();
                }
            }).always(function() {
                self.$$.find("spinner").remove();
            });
        },
        datatableRowClick: function(e, element) {
            var self = this;
            self.$$.find(".tr-selected").removeClass("tr-selected");    
            if (!jq(element).hasClass("tr-selected")) {
                jq(element).addClass("tr-selected");
                self.trigger("grid-row-clicked", self.gridInstance.row(element).data());
            }
        },
        // this method triggers checkbox based selection only
        rowSelectionChanged: function(e, element) {
            this.calculateSelectionChanged();
            this.setSelectRowsData(element);
            this.trigger("row-selection-changed", this.rowsSelected);
        },
        calculateSelectionChanged: function() {
            var self = this;
            var table = self.gridInstance.table().node();
            var chkbox_all = self.$$.find('.row-checkbox', table);
            var chkbox_checked = self.$$.find('.row-checkbox:checked', table);
            var chkbox_select_all = self.$$.find('input[type="checkbox"].select-all', table).get(0);
            // true if any row is selected
            chkbox_select_all.checked = !!(chkbox_checked.length);
            chkbox_select_all.indeterminate = (
                chkbox_checked.length && chkbox_checked.length < chkbox_all.length && 'indeterminate' in chkbox_select_all
            );
            self.tableConfig.actionsFormatter.call(self, chkbox_checked);
        },
        selectAllRows: function(e, element) {
            var self = this;
            var availableRows = self.gridElement.find(".row-checkbox:not(:disabled)");
            availableRows.prop("checked", element.checked);
            // clearing previous selection
            self.rowsSelected = [];
            availableRows.map(function(index, element) {
                self.setSelectRowsData(element);
            });
            self.trigger("row-selection-changed", self.rowsSelected);
            self.calculateSelectionChanged();
            e.stopPropagation();
        },
        // atleast one field inside the grid should be unique
        setSelectRowsData: function(element) {
            var row = jq(element).closest('tr');
            var data = this.gridInstance.row(row).data();
            var index = jq.inArray(data, this.rowsSelected);
            if (element.checked) {
                // don't add element if it already exists in the array - this scenerio might not occur in normal flow
                if(index === -1) {
                    this.rowsSelected.push(data);
                }
            } else {
                this.rowsSelected.splice(index, 1);
            }
        },
        getData: function() {
            // index: get specific row, empty: get all rows
            return this.gridInstance.rows.apply(this.getGridInstance, arguments).data();
        },
        draw: function(data) {
            var self = this;
            self.rowsSelected = [];
            self.$$.find('input[type="checkbox"].select-all').attr("checked", false);
            if(self.$$.find('input[type="checkbox"].select-all').length) {
                self.$$.find('input[type="checkbox"].select-all')[0].indeterminate = false;
            }
            self.$$.find(".grid-actions").hide();
            if(self.gridInstance) {
                if(data) {
                    self.gridInstance.clear();
                    self.gridInstance.rows.add(data);
                    self.gridInstance.draw();
                    // recalculating widths for the columns on redrawing
                    self.gridInstance.columns.adjust();
                } else if(self.tableConfig.serverSide) {
                    self.gridInstance.draw();
                } else {
                    jq.when(self.getGridData()).done(function(resp) {
                        self.gridInstance.clear();
                        self.gridInstance.rows.add(resp);
                        self.gridInstance.draw();
                        // recalculating widths for the columns on redrawing
                        self.gridInstance.columns.adjust();
                    }).always(function() {
                        self.$$.find("spinner").remove();
                    });
                }
            }
        },
        method: function(){
            // arguments[0] is function name to be called
            return this.gridInstance[arguments[0]].apply(this, Array.prototype.slice.call(arguments, 1, arguments.length));
        },
        _remove_: function() {
            var self = this;
            jq(window).off("resize", self.resizeTasks);
            jq("body").off("click", self.closeFilterSection);
        },
        getResize: function() {
            var self = this;
            return window.debounce(function() {
                var newHeight = self.$$.parent().height() - 40 - (self.tableConfig.paginate * 50);
                self.$$.find(".dataTables_scrollBody").height(newHeight);
            }, 200, null, self.$$.parent().attr("id"));
        }
    };
});