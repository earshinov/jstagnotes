/*

[ REQUIREMENTS ]

jQuery (http://jquery.com/)

[ OPTIMIZATION ]

If this script runs slowly, you may apply the following optiomizations:

0. Cache some DOM elements

1. Selection of a note by tag is a very common operation, which is rather slow.
   at the moment.

   We need an associative array that maps a tag to a set of notes tagged
   with this tag. Of course, tags means tag names here and notes means id's of
   HTML elements corresponding to notes (i.e., elements which have 'note' class).

   This associative array is simple to implement in JavaScript. The sets of notes
   can be simulated with another associative arrays.

   We need to build the array during our initialization. When user selects or
   deselects a tag, we can use the array to determine which notes to show and
   which ones to hide. That can be faster then iterating through notes
   checking their tags (the way applied at the moment).

2. Calculating tag's 'weight' in the tags cloud is also important.

   We can use the same array. To calculate the weight of a tag we just need to
   count the notes in the set the tag maps to, which are currently visible.

*/

/* --- Utils ---------------------------------------------------------------- */

if (Array.prototype.indexOf === undefined)
  Array.prototype.indexOf = function(x){
    var l = this.length;
    for (var i = 0; i < l; i++)
      if (this[i] == x)
        return i;
    return -1;
  };

function array_remove(array, element){
  for (var i = 0; i < array.length; i++)
    if (element == array[i])
      array.splice(i, 1);
}

function array_equal(first, second){
  if (first.length !== second.length)
    return false;
  for (var i = 0; i < first.length; i++)
    if (first[i] !== second[i])
      return false;
  return true;
}

jQuery.fn.any = function(fn){
  var ret = false;
  $(this).each(function(i, item){
    if (fn.call(this, item)){
      ret = true;
      return false; // break from 'each'
    }
  });
  return ret;
};

jQuery.fn.all = function(fn){
  var ret = true;
  $(this).each(function(i, item){
    if (!fn.call(this, item)){
      ret = false;
      return false; // break from 'each'
    }
  });
  return ret;
};

var Predicates = {
  hasText: function(text){ return function(){
    return $(this).text() === text;
  }; }
};

var Maps = {
  getText: function(){
    return $(this).text();
  }
};

/* --- Internationalization ------------------------------------------------- */

var L10N = L10N || {};

L10N.dict = L10N.dict || {};
//L10N.dict["Tags"] =
//L10N.dict["Hide"] =
//L10N.dict["Popular"] =
//L10N.dict["All"] =
//L10N.dict["Filter"] =
//L10N.dict["Add from list"] =
//L10N.dict["Clear"] =

L10N.dictPlural = L10N.dictPlural || {};
if (L10N.dictPlural["note"] === undefined)
  L10N.dictPlural["note"] = ["note", "notes"];

// http://translate.sourceforge.net/wiki/l10n/pluralforms
L10N.plural = L10N.plural || function(n){
  return n != 1;
};

var I18N = new function(){

  this.tr = function(text){
    var ret = L10N.dict[text];
    if (ret !== undefined)
      return ret;
    return text;
  };

  this.trPlural = function(n, texts, concat){
    var index = L10N.plural(n);
    index = +index; // convert to int
    var ret = L10N.dictPlural[texts][index];
    if (concat)
      ret = n + ' ' + ret;
    return ret;
  };

}();

/* --- Cloud ---------------------------------------------------------------- */

var Cloud = new function(){

  function addTag(tag, size, count){
    var $tags = $("#all_tags");
    if (size < 3)
      $tags = $tags.add("#popular_tags");
    $tags.append(" <a href='#' " +
      "title='" + I18N.trPlural(count, "note", true) + "' " +
      "class='note_tag tag_size_" + size + "'>" + tag + "</a>");
    $("#select_tag").append($(document.createElement("option")).text(tag));
  }

  this.recalculate = function(){
    //console.profile();

    $("#all_tags, #popular_tags").empty();
    $("#select_tag").children(":not(:empty)").remove();

    var tagsCount = {};
    var tagsArray = []; // for sorting
    var notesCountPerTag_max = Number.MIN_VALUE;

    $("div.note:visible a.note_tag").each(function(){
      var tag = $(this).text();
      if (!tagsCount.hasOwnProperty(tag)){
        tagsCount[tag] = 1;
        tagsArray.push(tag);
      }
      else{
        tagsCount[tag]++;
        if (tagsCount[tag] > notesCountPerTag_max)
          notesCountPerTag_max = tagsCount[tag];
      }
    });

    var notesCountPerTag_min = Number.MAX_VALUE;
    $.each(tagsCount, function(tag, count){
      if (count < notesCountPerTag_min)
        notesCountPerTag_min = count;
    });
    var notesCountPerTag_range = notesCountPerTag_max - notesCountPerTag_min + 1;

    tagsArray.sort(function(a, b){
      return a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase());
    });

    $.each(tagsArray, function(i, tag){
      if (!Filter.isTagChosen(tag)){
        var count = tagsCount[tag];
        var percent = count / notesCountPerTag_range;
        /* The numbers below were chosen a posteriori */
        addTag(tag, 3 - (percent > 0.1) - (percent > 0.3), count);
      }
    });

    /* IE does not automatically update select's width when the set of options is changed */
    if ($.browser.msie)
      $("#select_tag").css("width", "auto");

    //console.profileEnd();
  };

}();

/* --- Filter --------------------------------------------------------------- */

var Filter = new function(){

  var $clear, $filter;
  $(function(){
    $clear = $("#clear_filter");
    $filter = $("#filter");
  });

  function tagString(tag){
    return "<a href='#' class='note_tag chosen_tag'>" + tag + "</a>";
  }

  this.tags = [];

  this.isEmpty = function(){
    return this.tags.length === 0;
  };

  this.isTagChosen = function(tag){
    return this.tags.indexOf(tag) !== -1;
  };

  this.addTag = function(tag){
    this.tags.push(tag);
    $(tagString(tag)).insertBefore($clear);
    $filter.show();

    Notes.updateForSelectedTag(tag);
    Cloud.recalculate();
  };

  this.removeTag = function(tag){
    array_remove(this.tags, tag);
    $filter.find("a").filter(Predicates.hasText(tag)).remove();
    if (this.isEmpty())
      $filter.hide();

    Notes.updateForDeselectedTag(tag);
    Cloud.recalculate();
  };

  this.toggleTag = function(tag, condition){
    return condition ? this.addTag(tag) : this.removeTag(tag);
  };

  this.setTags = function(tags){
    /* prevent recursion */
    if (array_equal(this.tags, tags))
      return false;
    $filter.children("a").remove();
    this.tags = tags;
    if (this.tags.length === 0)
      $filter.hide();
    else{
      $filter.show();
      $.each(this.tags, function(i, tag){
        $(tagString(tag)).insertBefore($clear);
      });
    }

    Notes.update();
    Cloud.recalculate();
    return true;
  };

}();

/* --- Notes ---------------------------------------------------------------- */

var Notes = new function(){

  function noteSatisfiesFilter($note){
    var tags = $note.find("a.note_tag").map(Maps.getText).get();
    return $(Filter.tags).all(function(tag){
      return tags.indexOf(tag) !== -1;
    });
  }

  this.updateForSelectedTag = function(tag){

    /*
     * Collect all notes to hide in single jQuery object.
     *
     * If we hide a note as soon as find it in the loop,
     * Opera browser tries to update page to reflect DOM changes
     * everytime (and does this sloooooow).  On the other side,
     * this collecting slows down other browsers, so it worth
     * looking for a better solution.
     */
    var $hide = $([]);
    $("div.note:visible").each(function(){
      var $this = $(this);
      if (! $this.find("a.note_tag").any(Predicates.hasText(tag)))
        $hide = $hide.add($this);
    });
    $hide.removeClass("selected").hide();

    $("div.note a.note_tag").filter(Predicates.hasText(tag)).addClass("chosen_tag");
  };

  this.updateForDeselectedTag = function(tag){
    if (Filter.isEmpty()){
      $("div.note a.note_tag").removeClass("chosen_tag");
      $("div.note").removeClass("selected").show();
      return;
    }

    $("div.note:hidden").each(function(){
      if (noteSatisfiesFilter($(this)))
        $(this).show();
    });
    $("div.selected").each(function(){
      if (noteSatisfiesFilter($(this)))
        $(this).removeClass("selected");
    });

    $("div.note a.note_tag").filter(Predicates.hasText(tag)).removeClass("chosen_tag");
  };

  this.update = function(){
    $("div.note").each(function(){
      $(this).removeClass("selected").toggle(noteSatisfiesFilter($(this)));
    });

    $("div.note a.note_tag").each(function(){
      $(this).toggleClass("chosen_tag", Filter.isTagChosen($(this).text()));
    });
  };

  /*
   * Force a note to be shown.
   *
   * Function will do nothing if the note is visible. Otherwise it will
   * show the note and add "selected" CSS class to it.
   *
   * The note will be hidden again when a user changes the set of selected tags
   * (i.e., if he selects or deselects a tag) and the "selected" CSS class will
   * be removed.
   */
  this.showNote = function($note){
    $note.filter(":hidden").addClass("selected").show();
  };

}();

/* --- Startup -------------------------------------------------------------- */

function header(){
  document.write(
    "<h1>" + document.title + "</h1>\n" +
    "<div id='control'>\n" +
    "  <div id='cloud'>\n" +
    "    " + I18N.tr("Tags") + ":\n" +
    "    <a href='#' id='toggle_tags' class='js_link'>" + I18N.tr("Hide") +"</a>\n" +
    "    <a href='#' id='toggle_popular_tags' class='js_link active_link'>" + I18N.tr("Popular") +"</a>\n" +
    "    <a href='#' id='toggle_all_tags' class='js_link'>" + I18N.tr("All") +"</a>\n" +
    "    <div id='popular_tags'></div>\n" +
    "    <div id='all_tags' style='display: none'></div>\n" +
    "  </div>\n" +
    "  <div>\n" +
    "    <label for='select_tag'>" + I18N.tr("Add from list") + ":</label>\n" +
    "    <select id='select_tag'>\n" +
    "      <option></option>\n" +
    "    </select>\n" +
    "  </div>\n" +
    "  <div id='filter' style='display: none'>\n" +
    "    " + I18N.tr("Filter") + ":" +
      /*
       * Separate the label and the button with a single unbreakable space as IE6
       * ignores all ordinary space before buttons and thus sticks tags to the
       * label.  There must be no other whitespace here as otherwise normal
       * browsers will display several space characters.
       */
    "&nbsp;<button id='clear_filter'>" + I18N.tr("Clear") + "</button>\n" +
    "  </div>\n" +
    "</div>\n" +
    "<div id='notes'>");
}

function footer(){
  document.write("</div>");
}

$(document).ready(function(){
  basicInit();
  bindEventHandlers();
  bindTagCloudEventHandlers();
  initPrinting();

  function basicInit(){
    Cloud.recalculate();
  }

  function bindEventHandlers(){
    $("#select_tag")
      .keyup(function(e){
        if (e.keyCode === 27 /* Esc */)
          $(this).val("");
      })
      .change(function(e){
        var val = $(this).val();
        if (val !== "")
          Filter.addTag(val);
      });

    $("#clear_filter").click(function(){
      Filter.setTags([]);
    });

    $("a.note_tag").live("click", function(){
      var $this = $(this);

      var restoreScroll = $this.parent().is('.tags');
      var prevScroll;
      var prevOffset;
      if (restoreScroll){
        prevScroll = $(window).scrollTop();
        prevOffset = $this.offset().top;
      }

      Filter.toggleTag($this.text(), !$this.hasClass("chosen_tag"));
      if (restoreScroll)
        $(window).scrollTop(prevScroll + $this.offset().top - prevOffset);
      return false;
    });

    $("a[href^=#][href!=#]").each(function(){
      var $this = $(this);
      var $note = $($this.attr("href"));
      if ($note.is("div.note")){
        $this.click(function(){
          Notes.showNote($note);
          /* propagade the event further so that we actually follow the link */
        });
      }
    });
  }

  function bindTagCloudEventHandlers(){

    $("#toggle_tags").click(function(){
      if (!$(this).hasClass("active_link")){

        $("#toggle_popular_tags").removeClass("active_link");
        $("#toggle_all_tags").removeClass("active_link");
        $(this).addClass("active_link");

        $("#all_tags").hide();
        $("#popular_tags").hide();
      }
      return false;
    });

    $("#toggle_popular_tags").click(function(){
      if (!$(this).hasClass("active_link")){

        $("#toggle_tags").removeClass("active_link");
        $("#toggle_all_tags").removeClass("active_link");
        $(this).addClass("active_link");

        $("#all_tags").hide();
        $("#popular_tags").show();
      }
      return false;
    });

    $("#toggle_all_tags").click(function(){
      if (!$(this).hasClass("active_link")){

        $("#toggle_tags").removeClass("active_link");
        $("#toggle_popular_tags").removeClass("active_link");
        $(this).addClass("active_link");

        $("#popular_tags").hide();
        $("#all_tags").show();
      }
      return false;
    });
  }

  /*
   * Pretty printing of links.
   * http://beckelman.net/post/2009/02/16/Use-jQuery-to-Show-a-Linke28099s-Address-After-its-Text-When-Printing-In-IE6-and-IE7.aspx
   */
  function initPrinting(){
    if (window.onbeforeprint !== undefined){

      window.onbeforeprint = function(){
        /* Selector "a:not([href^=#])" does not work in IE as it appends
         * current page URL to the beginning of the href when it's retrieved
         * with JavaScript */
        $("a:not([href*=#])").each(function(){

          //Store the link's original text in the jQuery data store
          $(this).data("linkText", $(this).text());

          //Append the link to the current text
          $(this).append(" (" + $(this).attr("href") + ")");
        });
      };

      window.onafterprint = function(){
        $("a:not([href$=#])").each(function(){

          //Restore the links text to the original value by pulling it out of the jQuery data store
          $(this).text($(this).data("linkText"));
        });
      };
    }
    else{
      /* Fallback to CSS */
      $('html').addClass('prettyprint');
    }
  }
});
