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

/* --- Globals -------------------------------------------------------------- */

var $filter = null;

/* --- Cloud ---------------------------------------------------------------- */

var Cloud = new function(){

  function addTag(tag, size){
    var $tags = $("#all_tags");
    if (size < 3)
      $tags = $tags.add("#popular_tags");
    $tags.append(" <a href='#' class='note_tag tag_size_" + size + "'>" + tag + "</a>");
  }

  this.recalculate = function(){
    //console.profile();

    $("#all_tags a.note_tag").remove();
    $("#popular_tags a.note_tag").remove();

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
        var percent = tagsCount[tag] / notesCountPerTag_range;
        /* The numbers below were chosen a posteriori */
        addTag(tag, 3 - (percent > 0.1) - (percent > 0.3));
      }
    });

    //console.profileEnd();
  };

}();

/* --- Filter --------------------------------------------------------------- */

var Filter = new function(){

  this.tags = [];

  this.isEmpty = function(){
    return this.tags.length === 0;
  };

  this.isTagChosen = function(tag){
    return this.tags.indexOf(tag) !== -1;
  };

  this.addTag = function(tag){
    this.tags.push(tag);
    $filter.append("<a href='#' class='note_tag chosen_tag'>" + tag + "</a> ");
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

}();

/* --- Notes ---------------------------------------------------------------- */

var Notes = new function(){

  var $shownNotes = $([]);

  function noteSatisfiesFilter($note){
    var tags = $note.find("a.note_tag").map(Maps.getText).get();
    return $(Filter.tags).all(function(tag){
      return tags.indexOf(tag) !== -1;
    });
  }

  function updateCommon(){
    $shownNotes.hide().removeClass("selected");
    $shownNotes = $([]);
  }

  this.updateForSelectedTag = function(tag){
    updateCommon();

    /*
     * Collect all notes to hide in single jQuery object.
     *
     * If we hide a note as soon as find it in the loop,
     * Opera browser tries to update page to reflect DOM changes
     * everytime (and does this sloooooow).
     *
     * On the other side, this collecting slows down other browsers,
     * so it worth looking for a better solution.
     */
    var $hide = $([]);
    $("div.note:visible").each(function(){
      var $this = $(this);
      if (! $this.find("a.note_tag").any(Predicates.hasText(tag)))
        $hide = $hide.add($this);
    });
    $hide.hide();

    $("div.note a.note_tag").filter(Predicates.hasText(tag)).addClass("chosen_tag");
  };

  this.updateForDeselectedTag = function(tag){
    updateCommon();

    if (Filter.isEmpty()){
      $("div.note:visible a.note_tag").removeClass("chosen_tag");
      $("div.note:hidden").show();
      return;
    }

    $("div.note:hidden").each(function(){
      if (noteSatisfiesFilter($(this)))
        $(this).show();
    });

    $("div.note a.note_tag").filter(Predicates.hasText(tag)).removeClass("chosen_tag");
  };

  /*
   * This method is not actually used. It is just a template for
   * updateForSelectedTag() and updateForDeselectedTag().
   */
  this.update = function(){
    updateCommon();

    $("div.note").each(function(){
      $(this).toggle(noteSatisfiesFilter($(this)));
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
    if ($note.is(":hidden")){
      $shownNotes = $shownNotes.add($note);
      $note.addClass("selected").show();
    }
  };

}();

/* --- Startup -------------------------------------------------------------- */

$(document).ready(function(){

  basicInit();
  bindEventHandlers();
  bindTagCloudEventHandlers();
  initPrinting();

  function basicInit(){
    $("#toggle_popular_tags").addClass("active_link");
    $("#all_tags, #filter").hide();

    $filter = $("#filter");
    Cloud.recalculate();
  }

  function bindEventHandlers(){
    $("a.note_tag").live("click", function(){
      var $this = $(this);
      Filter.toggleTag($this.text(), !$this.hasClass("chosen_tag"));
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
        /* Selector "a[href!=#]" does not work in IE as it appends current page
         * URL to the beginning of the href when it's retrieved with JavaScript */
        $("a:not([href$=#])").each(function(){

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
