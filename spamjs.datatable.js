define({
    name: "spamjs.datatable",
    extend: "spamjs.view",
    modules: ["jsutils.server", "jQuery", "jsutils.file", "jsutils.tmpl"]
}).as(function(dataTableLoader, utilServer, jq, jsfile, tmplUtil) {
    return {
        events: {
            "click .datatable-row": "datatableRowClick",
            "change input[type='checkbox']": "rowSelectionChanged",
            "change .grid-actions": "gridActionSelected",
            "click input[type='checkbox'].select-all": "selectAllRows"
        },
        getServer: function() {
            return utilServer;
        },
        _init_: function(config) {
            var self = this;
            self.rowsSelected = [];
            var tableConfig = {
                data: [],
                columns: [],
                columnDefs: [],
                global: {},
                scrollY: "200px",
                dom: "Rfrtlip",
                // for hiding "Available Actions" in the grid actions
                showActionTitle: true,
                info: false,
                pathParams: {},
                scrollX: true,
                defaultColumnWidth: "160px",
                actionsList: [],
                // showCheckbox && rowReorder are not supported together
                showCheckbox: false,
                rowReorder: false,
                createdRow: function (row, data, index) {
                    jq(row).addClass("datatable-row");
                },
                correctPaginationData: function(paginateOptions) { return paginateOptions;},
                initComplete: function() { 
                    self.resizeDatatable();
                    if(self.tableConfig.paginate) {
                        self.$$.find("#gridContainer_wrapper").addClass("paginated-grid");
                    }
                    self.$$.find("#gridContainer_wrapper").animate({opacity: 1});
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
                self.generateColumnsConfig();
                self.generateActionsConfig();
                self.gridElement = self.$$.find("#gridContainer");
                jq.when(self.getGridData()).done(function() {
                    self.gridInstance = self.gridElement.DataTable(self.tableConfig);
                    self.bindExternalSearch();
                    self.bindRowReorder();
                    // configuring rendering of grid on resizing
                    jq(window).resize(function() {
                        self.resizeDatatable();
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
        // fetches data only in case of client side grid
        getGridData: function() {
            var self = this;
            if (!self.tableConfig.url) {
                return self.tableConfig.data;
            }
            if (!self.tableConfig.serverSide) {
                var paginateOptions = self.tableConfig.correctPaginationData({});
                self.$$.append("<spinner mid-spinner></spinner>");
                return self.getServer().get(
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
                }
                _.each(actionsList, function(item) {
                    self.$$.find(".grid-actions").append(
                        '<option '+ (item.disabled ? 'disabled': '') +' value="' + item.key + '">' + item.key + '</option>'
                    );
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
                    self.trigger("row-reorder", diff);
                });
            }
        },
        gridActionSelected: function(e, element) {
            var self = this;
            self.trigger("grid-action-selected", {
                option: jq(element).val(),
                rows: self.rowsSelected
            });
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
            var actions = self.jqfile.find("#actions").children();
            _.each(actions, function(element) {
                self.tableConfig.actionsList.push({
                    disabled: element.getAttribute("disabled"),
                    key: element.innerHTML
                });
            });
        },
        generateTableConfig: function() {
            var self = this;
            self.tableConfig = jq.extend(self.tableConfig, self.jqfile.find("#config").data());
            self.tableConfig = jq.extend(self.tableConfig, self.jqfile.find("#pagination").data());
            self.tableConfig = jq.extend(self.tableConfig, self.jqfile.find("#ajax").data());
            // pagination: 50 & header: 40
            self.tableConfig.scrollY = this.$$.parent().height() - 40 - (this.tableConfig.paginate * 50);
            // configure ajax
            if (self.tableConfig.serverSide) {
                self.tableConfig.ajax = function(data, callback, settings) {
                    self.resizeDatatable();
                    self.rowsSelected = [];
                    return self.configurePagination.apply(self, arguments);
                }
            }
        },
        generateColumnsConfig: function() {
            var self = this;
            var columns = self.jqfile.find("columns").children();
            if(self.tableConfig.showCheckbox) {
                // if dummy template for the checkbox column is available
                if(jq(columns[0]).attr("type") === "checkbox") {
                    self.checkboxConfig = {
                        title: jq(columns[0]).find("title").html() || "&nbsp;",
                        className: columns[0].getAttribute("class") || "dt-head-center",
                        html: jq(columns[0]).find("row").html()
                    };
                }
                self.tableConfig.columns.push(jq.extend({
                    type: "html",
                    title: '<input type="checkbox" class="select-all" />',
                    className: "dt-head-center",
                    orderable: false,
                    html: '<input type="checkbox" class="row-checkbox/>'
                }, self.checkboxConfig));  
                self.tableConfig.columns[0].render = function(data, type, full, meta) {
                    return tmplUtil.compile(self.tableConfig.columns[0].html, full);
                };
            }
            if(self.tableConfig.rowReorder) {
                self.tableConfig.columns.push({
                    type: "html",
                    title: '&nbsp;',
                    className: "dt-head-center",
                    orderable: false,
                    render: function(data, type, full, meta) {
                        return '<span grab><i class="icon icon_vertical_dots"></i></span>';
                    }
                });
            }
            // if dummy template for the checkbox column is available: (+!!(self.checkboxConfig)) will give 1
            for(var i = (+!!(self.checkboxConfig)); i < columns.length; i++) {
                self.tableConfig.columns.push({
                    type: "html",
                    key: columns[i].getAttribute("key"),
                    visible: !columns[i].getAttribute("hidden"),
                    title: columns[i].getAttribute("title") || "&nbsp;",
                    className: columns[i].getAttribute("class") || "dt-head-left",
                    orderable: !!columns[i].getAttribute("sort"),
                    width: columns[i].getAttribute("width") || self.tableConfig.defaultColumnWidth,
                    render: (function(index) {
                        var compile = tmplUtil.compile(columns[index].innerHTML);
                        return function(data, type, full, meta) {
                            return compile(jq.extend(full, self.tableConfig.global)).trim() || "-";
                        }
                    })(i)
                });
                if(columns[i].getAttribute("presort")) {
                    self.tableConfig.order = [[i, columns[i].getAttribute("presort-direction") || "asc"]]
                }
            }
        },
        configurePagination: function(data, callback) {
            var self = this;
            var paginateOptions = {
                pageNumber: (data.start / data.length + 1),
                pageSize: data.length
            };
            if (data.order.length) {
                // FYI: Current datatable supports either row reodering or checkbox
                // var orderIndex = data.order[0].column + (+!!self.tableConfig.rowReorder);
                var orderIndex = data.order[0].column;
                paginateOptions.orderBy = self.tableConfig.columns[orderIndex].key;
                paginateOptions.sortAscending = (data.order[0].dir === "asc");
            }
            // editing params required before datatable fetches data
            paginateOptions = self.tableConfig.correctPaginationData(paginateOptions);
            self.$$.append("<spinner mid-spinner></spinner>");
            self.getServer().get(
                self.tableConfig.url, 
                paginateOptions, 
                self.tableConfig.pathParams
            ).done(function(resp) {
                callback({
                    data: resp.content,
                    recordsTotal: resp.totalElements,
                    recordsFiltered: resp.totalElements,
                    draw: data.draw
                });
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
            if (element.checked) {
                self.gridElement.find('.row-checkbox:not(:checked)').trigger('click');
            } else {
                self.gridElement.find('.row-checkbox:checked').trigger('click');
            }
            e.stopPropagation();
        },
        setSelectRowsData: function(element) {
            var self = this;
            var row = jq(element).closest('tr');
            var data = self.gridInstance.row(row).data();
            var index = jq.inArray(data, self.rowsSelected);
            if (element.checked) {
                self.rowsSelected.push(data);
            } else {
                self.rowsSelected.splice(index, 1);
            }
        },
        getData: function() {
            // index: get specific row, empty: get all rows
            return this.gridInstance.rows.apply(this.getGridInstance, arguments).data();
        },
        draw: function(data) {
            var self = this;
            if(self.gridInstance) {
                if(data) {
                    self.gridInstance.clear();
                    self.gridInstance.rows.add(data);
                    self.gridInstance.draw();
                } else if(self.tableConfig.serverSide) {
                    self.gridInstance.draw();
                } else {
                    jq.when(self.getGridData()).done(function(resp) {
                        self.gridInstance.clear();
                        self.gridInstance.rows.add(resp);
                        self.gridInstance.draw();
                    }).always(function() {
                        self.$$.find("spinner").remove();
                    });
                }
            }
        },
        method: function(methodname, a, b, c, d, e){
            return this.gridInstance[methodname](a, b, c, d, e);
        },
        _remove_: function() {
            var self = this;
            jq(window).off("resize", self.resizeDatatable);
        },
        resizeDatatable: window.debounce(function() {
            var newHeight = this.$$.parent().height() - 40 - (this.tableConfig.paginate * 50);
            this.$$.find(".dataTables_scrollBody").height(newHeight);
        }, 100)
    };
});
