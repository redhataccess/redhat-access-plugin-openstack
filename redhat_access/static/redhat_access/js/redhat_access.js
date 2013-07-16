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

var loggedIn = false;

horizon.addInitFunction(function () {
    // Set up stuff for RHN/Strata queries

    var authAjaxParams = $.extend({
        url : 'https://' + portal_hostname +
              '/services/user/status?jsoncallback=?',
        success : function (auth) {
            'use strict';
            if (auth.authorized) {
                $('#logged-in').html("<h5><a style='color: green' href='http://access.redhat.com'>Logged in to RHN as " + auth.name + "</a></h5>");
                loggedIn = true;
            } else {
                $('#logged-in').html("<h4><a style='color: red' href='https://access.redhat.com'>Not logged in to RHN, please login and refresh this page</a></h4>");
                loggedIn = false;
            }
        }
    }, baseAjaxParams);

    // See if we are logged in to RHN or not
    $.ajax(authAjaxParams);

    //Set up event listeners
    $(document).on('submit', '#analyze', function (evt) {
        analyzeLogData();
        evt.preventDefault();
    });

    $(document).on('submit', '#rh-search', function (evt) {
        doSearch($('#rhSearchStr').val());
        evt.preventDefault();
    });
});

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
    if (selectedText.toString() === '') {
      data = $('#log-text')[0].innerText;
  }
  else {
     data = selectedText.toString();
 }

 $('pre.logs').css('width', '50%');
 $('pre.logs').css('float', 'left');
 $('pre.logs').after("<div id='solutions' style='width: 47%; float: right;'><div id='diag-inprog' style='position: relative; left: 50%;'><img src='/static/redhat_access/img/spinner.gif'></div></div>");
 $('#solutions').append("<div class='accordion' id='solnaccordion'></div>");
 getSolutionsFromText(data, fetchSolutions);
}

function getSolutionsFromText(data, handleSuggestions) {
    var getSolutionsFromTextParms = $.extend( {}, baseAjaxParams, {
      url: 'https://' + strata_hostname + '/rs/problems?limit=10',
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
}

function searchResult(element, index, array) {
    var fetchSolutionText = $.extend({}, baseAjaxParams, {
        dataType: 'json',
        contentType: 'application/json',
        url: element.uri,
        type: "GET",
        method: "GET",
        success: function (response) {
            appendSolutionText(response, index);
        }
    });
    $.ajax(fetchSolutionText);

}

function fetchSolution(element, index, array) {
    var accordion_header = "<div class='accordion-group'>"
                                        + "<div class='accordion-heading'>"
                                        + "<a class='accordion-toggle' data-toggle='collapse' "
                                        + "data-parent='solnaccordion' href='#soln" + index + "'>"
                                        + element.value + "</a></div>";
    var soln_block = "<div id='soln" + index + "' class='accordion-body collapse'>"
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
        url: element.uri,
        type: "GET",
        method: "GET",
        success: function (response) {
            appendSolutionText(response, index);
        }
    });
    $('#solutions').append(accordion_header);
    $.ajax(fetchSolutionText);
}

function appendSolutionText(response, index) {
    var environment_html = response.environment.html;
    var issue_html = response.issue.html;
    var resolution_html = '';
    if (response.resolution !== undefined) {
        resolution_html = response.resolution.html;
    }
    var solution_html = "<h3>Environment</h3>" + environment_html
                                + "<h3>Issue</h3>" + issue_html
                                + "<h3>Resolution</h3>" + resolution_html;
    $('#soln' + index + '-inner').append(solution_html);
}
