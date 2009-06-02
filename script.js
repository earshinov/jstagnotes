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
   
[ NOTES ]

1. CSS class selectors (".class") are slow if no tag is specified. Thus I use
   "tag.class" if the tag is known.

2. We can use jQuery Live Plugin or wait until jQuery 1.3 release become
   available in order to simplify the code a little by removing
   tag_setClickHandler() from the code.
   
   In actual, I've already tried to use both the plugin and jQuery 1.3 Beta 1,
   but they did not work.
      
   The plugin did not assign click handler as there were no plugin at all.
   
   And jQuery 1.3 Beta is not still usable due to an
   NS_ERROR_INVALID_POINTER exception. I've even tried to convert everything
   from XHTML to HTML, but it did not help.

*/

/* --- Utils ---------------------------------------------------------------- */

if (!Array.prototype.indexOf)
  Array.prototype.indexOf = function(x) {
    var l = this.length;
    for (var i = 0; i < l; i++)
      if (this[i] == x)
        return i;
    return -1;
  }

function array_remove(array, element) {
  for (i in array)
    if (element == array[i])
      array.splice(i, 1);
}

jQuery.fn.exists = function(fn){
  var ret = false;
  $(this).each(function(){
    this.fn = fn; // 'this' must be available in 'fn'
    if (this.fn()){
      ret = true;
      return false; // break from 'each'
    }
  });
  return ret;
}

jQuery.fn.existsText = function(text){
  return $(this).exists(function(){
    return $(this).text() == text;
  });
}

jQuery.fn.select = function(fn, callback){
  $(this).each(function(){
    this.fn = fn; // 'this' must be available in 'fn'
    if (this.fn()){
      this.callback = callback;
      return this.callback(); // 'this' must be available in 'callback'
    }
  });
}

/* --- Cloud ---------------------------------------------------------------- */

var Cloud = new function(){

  this.addTag = function(tag, size){
    var $allTags = $("#all_tags").append(" ");
    var $a = $("<a href='' class='note_tag tag_size_" + size + "'>" + tag + "</a>").appendTo($allTags);
    tag_setClickHandler($a);
      
    if (size < 3){
      var $popularTags = $("#popular_tags").append(" ");
      var $b = $a.clone().appendTo($popularTags);
      tag_setClickHandler($b);
    }
  }

  this.recalculate = function(){
    //console.profile();
    
    $("#all_tags a.note_tag").remove();
    $("#popular_tags a.note_tag").remove();

    var tags = new Object();
    var tagsArray = new Array();    
    var notesCountPerTag_max = 1;

    $("table.note:visible a.note_tag").each(function(){
      tag = $(this).text();
      
      if (!tags[tag]){
        tags[tag] = 1;
        tagsArray.push(tag);
      }
      else{
        tags[tag]++;
        
        if (tags[tag] > notesCountPerTag_max)
          notesCountPerTag_max = tags[tag];
      }
    });

    tagsArray.sort(function(a, b){
      var a1 = a.toLowerCase();
      var b1 = b.toLowerCase();

      /* Unfortunately, JavaScript does not provide a method like strcmp */
      if (a1 < b1) return -1;
      if (a1 == b1) return 0;
      return 1;
    });
    
    var notesCountPerTag_min = 1;
    if (tags.length > 0){      
      var _first = true;
      for (tag in tags)
        if (_first){
          notesCountPerTag_min = tags[tag];
          _first = false;
        }
        else if (tags[tag] < notesCountPerTag_min)
          notesCountPerTag_min = tags[tag];
    }

    var notesCountPerTag_range = notesCountPerTag_max - notesCountPerTag_min + 1;
    for (index in tagsArray) {
      var tag = tagsArray[index];
      
      if (Filter.isTagChosen(tag))
        continue;
      
      var _size = tags[tag] / notesCountPerTag_range;
      /* The numbers below was chosen a posteriori */
      if (_size > 0.3)
        _size = 1;
      else if (_size > 0.1)
        _size = 2;
      else
        _size = 3;
      
      this.addTag(tag, _size);
    }
    
    //console.profileEnd();
  }

}();

/* --- Filter --------------------------------------------------------------- */

var Filter = new function(){

  this.tags = new Array();
  
  this.isEmpty = function(){
    return this.tags.length == 0;
  }

  this.addTag = function(tag){
    this.tags.push(tag);
  
    $("#chosen_tags").show();
    $("#chosen_tags").append("<a href='' class='chosen_tag'>" + tag + "</a> ");
    tag_setClickHandler($("#chosen_tags a.chosen_tag:last"));
    
    Notes.updateForSelectedTag(tag);
    Cloud.recalculate();
  }
  
  this.removeTag = function(tag){
  
    $("#chosen_tags a.chosen_tag").select(
      function(){
        return $(this).text() == tag;
      },
      function(){
        $(this).remove();
        return false; // break (select only one)
      }
    );
        
    array_remove(this.tags, tag);
    if (this.isEmpty())
      $("#chosen_tags").hide();
    
    Notes.updateForDeselectedTag(tag);
    Cloud.recalculate();
  }
  
  this.isTagChosen = function(tag){
    return this.tags.indexOf(tag) != -1;
  }

}();

/* --- Notes ---------------------------------------------------------------- */

var Notes = new function(){

  this.updateForSelectedTag = function(tag){
  
    $("table.note:visible").each(function(){
      if (! $(this).find("a.note_tag").existsText(tag)){
        $(this).hide();
      }
    });
    
    $("table.note a.note_tag").select(
      function(){
        return $(this).text() == tag; 
      },
      function(){
        $(this).addClass("chosen_tag");
      }
    );
  }

  this.updateForDeselectedTag = function(tag){
  
    if (Filter.isEmpty()){
      $("table.note:visible a.note_tag").removeClass("chosen_tag");
      $("table.note:hidden").show();
      return;
    }
   
    $("table.note:hidden").each(function(){
      var $tags = $(this).find("a.note_tag");
      for (var i = 0; i < Filter.tags.length; i++){
        if (! $tags.existsText(Filter.tags[i])){
          return;
        }
      }
      $(this).show();
    });
    
    $("table.note a.note_tag").select(
      function(){
        return $(this).text() == tag; 
      },
      function(){
        $(this).removeClass("chosen_tag");
      }
    );
  }

  /*
    This method is not actually used. It is just a template for
    updateForSelectedTag() and updateForDeselectedTag().
  */
  this.update = function(){

    $("table.note").each(function(){
      var $tags = $(this).find("a.note_tag");
      for (var i = 0; i < Filter.tags.length; i++){
        if (! $tags.existsText(Filter.tags[i])){
          $(this).hide();
          return;
        }
      }
      $(this).show();
    });
    
    $("table.note a.note_tag").each(function(){
      if (Filter.isTagChosen($(this).text())){
        $(this).addClass("chosen_tag"); 
      }
      else{
        $(this).removeClass("chosen_tag");
      }
    });
  }

}();

/* --- Tag utils ------------------------------------------------------------ */

function tag_setClickHandler($tags){
  $tags.unbind("click").click(function(){
    if ($(this).hasClass("chosen_tag"))
      Filter.removeTag($(this).text());
    else
      Filter.addTag($(this).text());
    return false;
  });
}

/* --- Startup -------------------------------------------------------------- */

$(document).ready(function(){
  
  Cloud.recalculate();
  
  tag_setClickHandler($("a.note_tag"));
  
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
});


