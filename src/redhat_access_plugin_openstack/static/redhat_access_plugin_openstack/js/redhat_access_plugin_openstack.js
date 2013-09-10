horizon.addInitFunction(function () {
    var accessRedhat = (function() {
        var portal_hostname = 'access.redhat.com';
        var strata_hostname = 'api.' + portal_hostname;
        var baseAjaxParams = {
            accepts : {
                jsonp : 'application/json,text/json'
            },
        crossDomain : true,
        type : 'GET',
        method : 'GET',
        headers : { 
            Accept : 'application/json,text/json'
        },
        xhrFields : { 
            withCredentials : true
        },
        contentType : 'application/json',
        data : {}, 
        dataType : 'jsonp'
        };
        // Set up stuff for RHN/Strata queries

        var authAjaxParams = $.extend({
            url : 'https://' + portal_hostname +
            '/services/user/status?jsoncallback=?',
            success : function (auth) {
                'use strict';
                if (auth.authorized) {
                    $('#logged-in').html("You are currently signed in to the Red Hat Customer Portal as " + auth.name + ".<a style='padding-left: 1%;' href='https://www.redhat.com/wapps/sso/logout.html' target='_blank'>Sign Out</a><a style='padding-left: 1%;' href='http://access.redhat.com' target='_blank'>Visit Customer Portal</a>");
                } else {
                    $('#logged-in').html("Please sign in to the Red Hat Customer Portal to access this information.     <a href='https://www.redhat.com/wapps/sso/login.html' target='_blank'>Sign In</a>");
                }
            }
        }, baseAjaxParams);

        // See if we are logged in to RHN or not
        $.ajax(authAjaxParams);

        function doSearch(searchStr) {
            getSolutionsFromText(searchStr, searchResults);
        }

        function getSelectedText() {
            var t = '';
            if(window.getSelection){
                t = window.getSelection();
            }else if(document.getSelection){
                t = document.getSelection();
            }else if(document.selection){
                t = document.selection.createRange().text;
            }
            return t;
        }

        function analyzeLogData() {
            var selectedText = getSelectedText();
            var data = '';
            if ((selectedText.toString() === '') || (selectedText.toString() === "")) {
                data = $('#log-text')[0].innerText;
                if (data === undefined) {
                    data = $('#log-text')[0].textContent;
                }
            }
            else {
                data = selectedText.toString();
            }

            $('pre.logs').css('width', '50%');
            $('pre.logs').css('float', 'left');
            $('pre.logs').after("<div id='solutions' style='width: 47%; float: right;'><div id='diag-inprog' style='position: relative; left: 50%;'><img src='/static/redhat_access_plugin_openstack/img/spinner.gif'></div></div>");
            $('#solutions').append("<div class='accordion' id='solnaccordion'></div>");
            getSolutionsFromText(data, fetchSolutions);
        }

        function getSolutionsFromText(data, handleSuggestions) {
            var getSolutionsFromTextParms = $.extend( {}, baseAjaxParams, {
                url: 'https://' + strata_hostname + '/rs/problems?limit=10&redhat_client=redhat-access-plugin-openstack_1.2.0-4',
                data: data,
                type: 'POST',
                method: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                success: function(response_body) {
                    //Get the array of suggestions
                    var suggestions = response_body.source_or_link_or_problem[2].source_or_link;
                    $('#diag-inprog').hide();
                    handleSuggestions(suggestions);
                },
                error: function(response) {
                    horizon.clearErrorMessages();
                    $('#diag-inprog').html("Failed to Diagnose Log Data.");
                    horizon.alert('error', gettext('There was a problem communicating with the server, please try again.'));
                }
            });
            $.ajax(getSolutionsFromTextParms);
        }

        function fetchSolutions(suggestions) {
            suggestions.forEach(fetchSolution);
        }

        function searchResults(suggestions) {
            $("#solutions").on("click", function () {
                $(".collapse").collapse('hide');
            });
            suggestions.forEach(fetchSolution);
            $(".accordion-toggle").click(function(){
                $(".accordion-heading").attr("style", "");
                $(this).parent().attr("style","background: #CBEAF5; font-weight: bold;");
            });
        }

        function fetchSolution(element, index, array) {
            var accordion_header = "<div class='accordion-group'>"
                + "<div class='accordion-heading'>"
                + "<a class='accordion-toggle' data-toggle='collapse' "
                + "data-parent='solnaccordion' href='#soln" + index + "'>"
                + element.value + "</a></div>";
            var soln_block = "<div id='soln" + index + "' class='accordion-body collapse in'>"
                + "<div id='soln" + index + "-inner' class='accordion-inner'></div></div></div>"

                if (document.getElementById('solution') !== null) {
                    $('#solution').append(soln_block);
                }
                else {
                    accordion_header = accordion_header + soln_block;
                }

            var fetchSolutionText = $.extend({}, baseAjaxParams, {
                dataType: 'json',
                contentType: 'application/json',
                url: element.uri + "?redhat_client=redhat-access-plugin-openstack_1.2.0-4",
                type: "GET",
                method: "GET",
                success: function (response) {
                    appendSolutionText(response, index);
                },
                error: function (response) {
                    var solnNumber = this.url.substr(this.url.lastIndexOf('/') + 1);
                    $('#soln' + index + '-inner').append("Please view this Solution on the Red Hat Customer Portal <a href='https://access.redhat.com/site/solutions/" + solnNumber + "?redhat_client=redhat-access-plugin-openstack_1.2.0-4' target='_blank'>View on Customer Portal</a>");
                }
            });
            $('#solutions').append(accordion_header);
            $(".collapse").collapse('hide');
            $.ajax(fetchSolutionText);
        }

        function appendSolutionText(response, index) {
            var solution_html = '';
            var environment_html = '';
            if (response.environment !== undefined) {
                environment_html = response.environment.html;
                solution_html = "<h3>Environment</h3>" + environment_html;
            }
            var issue_html = '';
            if (response.issue !== undefined) {
                issue_html = response.issue.html;
                solution_html = solution_html + "<h3>Issue</h3>" + issue_html;
            }
            var resolution_html = '';
            if (response.resolution !== undefined) {
                resolution_html = response.resolution.html;
                solution_html = solution_html + "<h3>Resolution</h3>" + resolution_html;
            }
            $('#soln' + index + '-inner').append(solution_html);
        }

        //Set up event listeners
        $(document).on('submit', '#analyze', function (evt) {
            analyzeLogData();
            evt.preventDefault();
        });

        $(document).on('submit', '#rh-search', function (evt) {
            doSearch($('#rhSearchStr').val());
            evt.preventDefault();
        });
    })();
});
