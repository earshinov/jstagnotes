//
// Requirements:
// - jQuery (http://jquery.com/)
//

var TestOptions = {
  test: false,
  firstTag: 'Windows',
  secondTag: 'Linux',
  delay: 4000
};

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

jQuery.fn.$indexOf = function(selectorOrElement){
  var $this = $(this);
  var $element = typeof selectorOrElement === 'string'
    ? $this.filter(selectorOrElement)
    : $(selectorOrElement);
  return $this.index($element);
};

var Predicates = {
  hasText: function(text){ return function(){
    return $(this).text() === text;
  }; }
};

var Maps = {
  getText: function(){
    return $(this).text();
  },
  fromId: function(id){
    return document.getElementById(id);
  }
};

/* --- Miscellaneous functions ---------------------------------------------- */

var cachedNotesBlockHeight = null;
function updateNotesBlockHeight(){
  var $notes = $('#notes');
  if (cachedNotesBlockHeight === null){
    var $wrapper = $('#wrap');
    cachedNotesBlockHeight =
      - $('h1').outerHeight(true)
      - ($wrapper.outerHeight(true) - $wrapper.height())
      - ($notes.outerHeight(true) - $notes.height());
  }
  $notes.css('height', cachedNotesBlockHeight
    + $(window).height()
    - $('#control').outerHeight(true));
}

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

/* --- Tags cache ----------------------------------------------------------- */

var TagsCache = new function(){

  var notes = []; // note ordinal -> array of tags
  this.sortedTags = []; // tags sorted lexicographically

  $(function(){
    var counter = 0;
    var tags = {}; // set of all tags, used for inserting unique values into sortedTags
    $(".note").each(function(){

      $(this).data("ordinal", counter);
      var noteTags = [];
      notes[counter] = noteTags;
      counter++;

      $(this).find(".note_tag").each(function(){
        var tag = $(this).text();
        noteTags.push(tag);
        if (!tags.hasOwnProperty(tag)){
          tags[tag] = 0; // any value
          TagsCache.sortedTags.push(tag);
        }
      });
    });

    TagsCache.sortedTags.sort(function(a, b){
      return a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase());
    });
  });

  this.getNoteTags = function($note){
    return notes[$note.data("ordinal")];
  };

}();

/* --- Cloud ---------------------------------------------------------------- */

var Cloud = new function(){

  var BLOCK_IDS = ["popular_tags", "all_tags", undefined];
  var SWITCH_IDS = ["toggle_popular_tags", "toggle_all_tags", "toggle_tags"];

  var currentIndex, selectedIndex;
  $(function(){
    var $switches = $($.map(SWITCH_IDS, Maps.fromId));
    currentIndex = selectedIndex = $switches.$indexOf(".active_link");

    $switches.click(function(){
      selectedIndex = SWITCH_IDS.indexOf($(this).attr("id"));
      switchBlock(selectedIndex) && updateNotesBlockHeight();
      return false;
    });
  });

  function switchBlock(index){
    if (index === currentIndex)
      return false;
    $(Maps.fromId(SWITCH_IDS[currentIndex])).removeClass("active_link");
    $(Maps.fromId(SWITCH_IDS[index])).addClass("active_link");

    var blockId = BLOCK_IDS[currentIndex];
    if (blockId !== undefined)
      $(Maps.fromId(blockId)).hide();

    blockId = BLOCK_IDS[index];
    if (blockId !== undefined)
      $(Maps.fromId(blockId)).show();

    currentIndex = index;
    return true;
  }

  function temporarilySwitchBlock(){
    var $blocks = $($.map(BLOCK_IDS.slice(selectedIndex), Maps.fromId));
    var index = $blocks.$indexOf(":not(:empty)");
    index = index === -1 ? BLOCK_IDS.length - 1 : index + selectedIndex;
    return switchBlock(index);
  }

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
    if (TestOptions.test)
      console.time("Cloud.recalculate");

    $($.map(BLOCK_IDS, Maps.fromId)).empty();
    $("#select_tag").children(":not(:empty)").remove();

    var tagsCount = {};
    var countMax = 1;

    $(".note").each(function(){

      /* We don't use ".note:visible" selector as it checks element's dimensions,
       * not the display mode.  At least in current Firefox getting dimensions
       * waits until browser completes reflow process.  It is quite apparent
       * when you select a single tag and then deselect it; with this
       * optimisation function completes two times faster */
      if (this.style.display === "none")
        return; // continue

      $.each(TagsCache.getNoteTags($(this)), function(i, tag){
        if (!tagsCount.hasOwnProperty(tag))
          tagsCount[tag] = 1;
        else{
          var count = ++tagsCount[tag];
          if (count > countMax)
            countMax = count;
        }
      });
    });

    /* The proper formula is range = max - min + 1
     * We don't bother finding min as it's most likely 1 in our case */
    var countRange = countMax;

    $.each(TagsCache.sortedTags, function(i, tag){
      var count = tagsCount[tag];
      if (count > 0 && !Filter.isTagChosen(tag)){
        var percent = count / countRange;
        /* The numbers below were chosen a posteriori */
        addTag(tag, 3 - (percent > 0.1) - (percent > 0.3), count);
      }
    });

    /* IE does not automatically update select's width when the set of options is changed */
    if ($.browser.msie)
      $("#select_tag").css("width", "auto");

    temporarilySwitchBlock();
    updateNotesBlockHeight();

    if (TestOptions.test)
      console.timeEnd("Cloud.recalculate");
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

    if (TestOptions.test)
      console.time("Notes.updateForSelectedTag");
    Notes.updateForSelectedTag(tag);
    if (TestOptions.test)
      console.timeEnd("Notes.updateForSelectedTag");

    Cloud.recalculate();
  };

  this.removeTag = function(tag){
    array_remove(this.tags, tag);
    $filter.find("a").filter(Predicates.hasText(tag)).remove();
    if (this.isEmpty())
      $filter.hide();

    if (TestOptions.test)
      console.time("Notes.updateForDeselectedTag");
    Notes.updateForDeselectedTag(tag);
    if (TestOptions.test)
      console.timeEnd("Notes.updateForDeselectedTag");
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
    var tags = TagsCache.getNoteTags($note);
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
     *
     * Don't use jQuery.add() as in jQuery 1.4.2, probably because of the sort
     * by document order introduced in 1.4, it is awfully slow in (at lease an
     * old version of) Chrome causing the execution time of this function to
     * increase ~100 times.
     */
    var domHide = [];
    $(".note:visible").each(function(){
      var $this = $(this);
      if (TagsCache.getNoteTags($this).indexOf(tag) === -1)
        domHide.push(this);
    });
    $(domHide).removeClass("selected").hide();

    $("#notes .note_tag").filter(Predicates.hasText(tag)).addClass("chosen_tag");
  };

  this.updateForDeselectedTag = function(tag){
    if (Filter.isEmpty()){
      $("#notes .note_tag").removeClass("chosen_tag");
      $(".note").removeClass("selected").show();
      return;
    }

    $(".note:hidden").each(function(){
      if (noteSatisfiesFilter($(this)))
        $(this).show();
    });
    $(".selected").each(function(){
      if (noteSatisfiesFilter($(this)))
        $(this).removeClass("selected");
    });

    $("#notes .note_tag").filter(Predicates.hasText(tag)).removeClass("chosen_tag");
  };

  this.update = function(){
    $(".note").each(function(){
      $(this).removeClass("selected").toggle(noteSatisfiesFilter($(this)));
    });

    $("#notes .note_tag").each(function(){
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
    "<div id='wrap'>\n" +
    "  <h1>" + document.title + "</h1>\n" +
    "  <div id='control'>\n" +
    "    <div id='cloud'>\n" +
    "      " + I18N.tr("Tags") + ":\n" +
    "      <a href='#' id='toggle_tags' class='js_link'>" + I18N.tr("Hide") +"</a>\n" +
    "      <a href='#' id='toggle_popular_tags' class='js_link active_link'>" + I18N.tr("Popular") +"</a>\n" +
    "      <a href='#' id='toggle_all_tags' class='js_link'>" + I18N.tr("All") +"</a>\n" +
    "      <div id='popular_tags'></div>\n" +
    "      <div id='all_tags' style='display: none'></div>\n" +
    "    </div>\n" +
    "    <div>\n" +
    "      <label for='select_tag'>" + I18N.tr("Add from list") + ":</label>\n" +
    "      <select id='select_tag'>\n" +
    "        <option></option>\n" +
    "      </select>\n" +
    "    </div>\n" +
    "    <div id='filter' style='display: none'>\n" +
    "      " + I18N.tr("Filter") + ":" +
      /*
       * Separate the label and the button with a single unbreakable space as IE6
       * ignores all ordinary space before buttons and thus sticks tags to the
       * label.  There must be no other whitespace here as otherwise normal
       * browsers will display several space characters.
       */
    "&nbsp;<button id='clear_filter'>" + I18N.tr("Clear") + "</button>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <div id='notes'>");
}

function footer(){
  /* In Opera the bottom margin of the last note is ignored (see
   * http://dev.opera.com/forums/topic/789152). IE8 ignores both the margin
   * and the bottom padding of the container. To ensure the gap after the
   * last note is properly calculated, insert a dummy empty div. */
  document.write("<div style='padding-top: 1px; margin-top: -1px;'></div></div></div>");
}

$(document).ready(function(){

  if (!TestOptions.test)
    init();
  else{
    console.log("Test :: startup");
    console.time("Total");
    init();
    console.timeEnd("Total");

    window.setTimeout(function(){
      console.log("Test :: add first tag");
      Filter.addTag(TestOptions.firstTag);

      window.setTimeout(function(){
        console.log("Test :: add second tag");
        Filter.addTag(TestOptions.secondTag);

        window.setTimeout(function(){
          console.log("Test :: remove first tag");
          Filter.removeTag(TestOptions.firstTag);

          window.setTimeout(function(){
            console.log("Test :: remove second tag");
            Filter.removeTag(TestOptions.secondTag);

            console.log("Test :: finished");
          }, TestOptions.delay);
        }, TestOptions.delay);
      }, TestOptions.delay);
    }, TestOptions.delay);
  }

  var $notes = $("#notes");

  /* The main initialisation function */
  function init(){
    basicInit();
    bindEventHandlers();
    initPrinting();
  }

  function basicInit(){
    Cloud.recalculate();

    var resizeHandlerTimer = null;
    $(window).resize(function(){
      if (resizeHandlerTimer !== null)
        clearTimeout(resizeHandlerTimer);
      resizeHandlerTimer = setTimeout(updateNotesBlockHeight, 400);
    });
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

    $(".note_tag").live("click", function(){
      var $this = $(this);
      function getReferenceOffset(){
        return $notes.scrollTop() + $this.offset().top;
      }

      var restoreScroll = $this.parent().is('.tags');
      var prevScroll;
      var prevOffset;
      if (restoreScroll){
        prevScroll = $notes.scrollTop();
        prevOffset = getReferenceOffset();
      }

      Filter.toggleTag($this.text(), !$this.hasClass("chosen_tag"));

      var scrollPos = 0;
      if (restoreScroll)
        scrollPos = prevScroll + (getReferenceOffset() - prevOffset);
      $notes.scrollTop(scrollPos);

      return false;
    });

    $("a[href^=#][href!=#]").each(function(){
      var $this = $(this);
      var $note = $($this.attr("href"));
      if ($note.is(".note")){
        $this.click(function(){
          Notes.showNote($note);
          /* propagade the event further so that we actually follow the link */
        });
      }
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
