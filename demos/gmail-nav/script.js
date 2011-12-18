//
// Requirements:
// - jQuery ≥ 1.4 (http://jquery.com/)
// - jQuery BBQ: Back Button and Query Library (http://benalman.com/code/projects/jquery-bbq/)
// - jQuery.ScrollTo plugin (http://flesler.blogspot.com/2007/10/jqueryscrollto.html)
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
  first = first || [];
  second = second || [];
  if (first.length !== second.length)
    return false;
  for (var i = 0; i < first.length; i++)
    if (first[i] !== second[i])
      return false;
  return true;
}

jQuery.any = function(obj, fn){
  var ret = false;
  $.each(obj, function(i, item){
    if (fn.call(this, i, item)){
      ret = true;
      return false; // break from 'each'
    }
  });
  return ret;
};

jQuery.fn.any = function(fn){
  return $.any($(this), fn);
};

jQuery.all = function(obj, fn){
  var ret = true;
  $.each(obj, function(i, item){
    if (!fn.call(this, i, item)){
      ret = false;
      return false; // break from 'each'
    }
  });
  return ret;
};

jQuery.fn.all = function(fn){
  return $.all($(this), fn);
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

function getUnhashedLocation(){
  return window.location.href.replace(/#.*/, '');
}

function getLocalLinks(){
  /* IE appends current page URL to relative links (including ones starting with #) */
  var location = getUnhashedLocation();
  return $("a[href^='#'][href!='#'], a[href^='" + location + "#'][href!='" + location + "#']");
}

function getForeignLinks(){
  /* IE appends current page URL to relative links (including ones starting with #) */
  var location = getUnhashedLocation();
  return $("a:not([href^='#']):not([href^='" + location + "#'])");
}

/* --- Internationalization ------------------------------------------------- */

var L10N = L10N || {};

L10N.dict = L10N.dict || {};
//L10N.dict["Tags"] =
//L10N.dict["Hide"] =
//L10N.dict["Popular"] =
//L10N.dict["All"] =
//L10N.dict["Filter"] =
//L10N.dict["Choose from list"] =
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

  var USER_BLOCK_IDS = ["popular", "all", "hide"];
  var BLOCK_IDS = ["popular_tags", "all_tags", undefined];
  var SWITCH_IDS = ["toggle_popular_tags", "toggle_all_tags", "toggle_tags"];

  var selectedIndex, currentIndex, defaultIndex;
  $(function(){
    var $switches = $($.map(SWITCH_IDS, Maps.fromId));
    selectedIndex = currentIndex = defaultIndex = $switches.$indexOf(".active_link");

    $switches.click(function(){
      selectedIndex = SWITCH_IDS.indexOf($(this).attr("id"));
      switchBlock(selectedIndex);
      State.sync();
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

  this.getSelectedTagBlock = function(){
    return selectedIndex === defaultIndex ? null : USER_BLOCK_IDS[selectedIndex];
  };

  this.setSelectedTagBlock = function(id){
    var index = id === undefined ? defaultIndex : USER_BLOCK_IDS.indexOf(id);
    if (index === -1 || index === selectedIndex)
      return false;
    selectedIndex = index;
    temporarilySwitchBlock();
    return true;
  };

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
    return "<a href='#' class='note_tag chosen_tag'>" + tag + "</a> ";
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
    $clear.before(tagString(tag));
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
    $filter.children("a").remove();
    this.tags = tags;
    if (this.tags.length === 0)
      $filter.hide();
    else{
      $filter.show();
      $.each(this.tags, function(i, tag){
        $clear.before(tagString(tag));
      });
    }

    Notes.update();
    Cloud.recalculate();
  };

}();

/* --- Notes ---------------------------------------------------------------- */

var Notes = new function(){

  function noteSatisfiesFilter($note){
    var tags = TagsCache.getNoteTags($note);
    return $(Filter.tags).all(function(_, tag){
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
      if (TagsCache.getNoteTags($this).indexOf(tag) === -1){
        State.removeAnchor($this);
        State.removeSelected($this);
        domHide.push(this);
      }
    });
    $(domHide).hide();

    $("#notes .note_tag").filter(Predicates.hasText(tag)).addClass("chosen_tag");
  };

  this.updateForDeselectedTag = function(tag){
    if (Filter.isEmpty()){
      $("#notes .note_tag").removeClass("chosen_tag");
      $(".note").show();
      State.setSelected([]);
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

    State.setSelected([]);
    $(".note").each(function(){
      if (noteSatisfiesFilter($(this)))
        $(this).show();
      else{
        State.removeAnchor($(this));
        $(this).hide();
      }
    });

    $("#notes .note_tag").each(function(){
      $(this).toggleClass("chosen_tag", Filter.isTagChosen($(this).text()));
    });
  };

}();

/* --- State ---------------------------------------------------------------- */

/*
 * Object for storing the state managed by jQuery BBQ plugin.  It's needed
 * as we can't directly use $.bbq.pushState() each time a part of the state
 * changes because a change in one part may cause a change in another (for
 * example, change of tags may cause a temporarily shown note to become normal)
 * what would result in several history entries.  The following scheme is
 * proposed: code triggered by user action calls core methods, which modify
 * this object, and then State.sync().
 *
 * Setter functions usually return true if the value has changed from the last
 * time and was updated.  Otherwise false is returned.
 */
var State = new function(){

  var anchor = null;
  var scrollToAnchor = false;
  var selected = [];

  /*
   * Functions for managing selected tag block.
   * Selected tag block is remembered in Cloud, not in this object.
   */

  this.setSelectedTagBlock = function(id){
    return Cloud.setSelectedTagBlock(id);
  };

  /*
   * Functions for managing tags.
   * Actually what is written to history is Filter.tags array, and these
   * functions just provide additional abstraction level above Filter.
   */

  this.addTag = function(tag){
    Filter.addTag(tag);
  };

  this.removeTag = function(tag){
    Filter.removeTag(tag);
  };

  this.toggleTag = function(tag, condition){
    Filter.toggleTag(tag, condition);
  };

  this.setTags = function(tags){
    if (tags === undefined)
      tags = [];
    if (array_equal(Filter.tags, tags))
      return false;
    Filter.setTags(tags);
    return true;
  };

  /*
   * Functions for managing the anchor (if any)
   */

  // Flags for setAnchor()
  this.SCROLL_PREVENT = -1; // don't scroll
  this.SCROLL_AUTO = 0;     // default
  this.SCROLL_FORCE = 1;    // scroll to anchor even if anchor hasn't changed

  /*
   * Set anchor
   * @param anc               Current anchor or @c null
   * @param scrollBehaviour   One of SCROLL_* constants
   */
  this.setAnchor = function(anc, scrollBehaviour){
    if (anc === undefined)
      anc = null;
    scrollToAnchor =
      anc !== null && scrollBehaviour !== this.SCROLL_PREVENT &&
      (anchor !== anc || scrollBehaviour === this.SCROLL_FORCE);
    if (anchor === anc)
      return false;
    anchor = anc;
    return true;
  };

  this.removeAnchor = function($note){
    if ($note.attr("id") === anchor){
      anchor = null;
      scrollToAnchor = false;
      return true;
    }
    return false;
  }

  /*
   * Functions for managing temporarily shown ("selected") notes.
   *
   * Note that the add function shows the added note, but hide function does
   * not automatically hide it, and the set function takes an argument that
   * controls what to do.  That's because a selected note is always shown, by
   * definition, but when it becomes non-selected, it may either get normal
   * state or get hidden.
   */

  this.addSelected = function(id){
    var $note = $(Maps.fromId(id)).filter("div.note:hidden");
    if ($note.length === 0)
      return false;
    selected.push(id);
    $note.addClass("selected").show();
    return true;
  }

  this.removeSelected = function($note){
    var id = $note.attr("id");
    if (!id)
      return false;
    var pos = selected.indexOf(id);
    if (pos == -1)
      return false;
    selected.splice(pos, 1);
    $note.removeClass("selected");
    return true;
  }

  this.setSelected = function(sel, hide){
    if (sel === undefined)
      sel = [];
    if (array_equal(selected, sel))
      return false;

    var $notes = $("div.selected");
    $notes.removeClass("selected");
    if (hide)
      $notes.hide();

    selected = [];
    $.each(sel, function(id){
      State.addSelected(id);
    });
    return true;
  };

  /*
   * General functions
   */

  /* Push state to jQuery BBQ plugin */
  this.sync = function(scroll){
    if (scroll === undefined)
      scroll = true;

    var state = {
      tags: Filter.tags,
      selected: selected
    };
    if (anchor !== null){
      state["anchor"] = anchor;
      this.addSelected(anchor);
    }
    var tagBlock = Cloud.getSelectedTagBlock();
    if (tagBlock !== null)
      state["tagBlock"] = tagBlock;

    this.push(state, scroll && !scrollToAnchor);
    if (scroll && scrollToAnchor){
      //console.log("Calling scrollTo( <anchor> = #" + anchor + " )");
      $.scrollTo(Maps.fromId(anchor));
    }
  };

  this.push = function(state, restoreScroll, useReplace) {
    if (restoreScroll === undefined) restoreScroll = true;

    var prevScroll;
    if (restoreScroll && this.isEmpty(state))
      // According to BBQ plugin documentation,
      // setting empty state may cause browser to scroll
      prevScroll = $(window).scrollTop();

    // Replace URL
    // We intentionally don't check for meaningful changes in case of replace,
    // because writing "meaningless" bits like remembered scroll position
    // is what we use replace mode for.
    if( useReplace || State.hasMeaningfulChanges(state) )
      $.bbq.pushState(state, 2, useReplace);

    if (prevScroll !== undefined){
      //console.log("Calling scrollTo( <pos before setting empty #> = " + prevScroll + " )");
      $.scrollTo(prevScroll);
    }
  };

  this.replace = function(state, restoreScroll) {
    this.push(state, restoreScroll, true);
  };

  this.hasMeaningfulChanges = function(state){
    var currentState = $.bbq.getState();
    return ! (
      array_equal(state["tags"], currentState["tags"]) &&
      array_equal(state["selected"], currentState["selected"]) &&
      state["anchor"]   == currentState["anchor"] &&
      state["tagBlock"] == currentState["tagBlock"] );
  };

  this.isEmpty = function(state){
    return $.all(state, function(key, value){
      return
        key === "tags" && value.length === 0 ||
        key === "selected" && value.length === 0;
    });
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
    "      <label for='select_tag'>" + I18N.tr("Choose from list") + ":</label>\n" +
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
  document.write("</div></div>");
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

  /* The main initialisation function */
  function init(){
    basicInit();
    bindEventHandlers();
    initPrinting();
  }

  function hashchangeHandler(event){
    State.setSelectedTagBlock(event.getState("tagBlock"));
    if (!State.setTags(event.getState("tags")) && hashchangeHandler.firstTime)
      // Initialize the tag cloud if it wasn't already done by State
      Cloud.recalculate();
    State.setSelected(event.getState("selected"), true);

    // Read scroll position.
    var scrollPos = event.getState("scroll");
    if (scrollPos == hashchangeHandler.ignoredScroll)
      scrollPos = undefined;
    hashchangeHandler.ignoredScroll = null;
    // If scroll position is present, we shouldn't scroll to anchor
    var anchorScrollBehaviour = ( scrollPos === undefined
      ? State.SCROLL_AUTO
      : State.SCROLL_PREVENT );

    State.setAnchor(event.getState("anchor"), anchorScrollBehaviour);

    State.sync();

    if (scrollPos !== undefined){
      // Remove the remembered scroll position.  This "hashchange"
      // handler will be called again, but it will do nothing
      var state = event.getState();
      delete state["scroll"];
      State.replace(state, false);
      // Restore the scroll position
      //console.log("Calling scrollTo( <remembered scroll pos> = " + scrollPos + " )");
      $(window).scrollTo(scrollPos);
    }
  }

  function basicInit(){
    hashchangeHandler.firstTime = true;
    hashchangeHandler.ignoredScroll = null;
    $(window).bind("hashchange", hashchangeHandler).trigger("hashchange");
    hashchangeHandler.firstTime = false;
  }

  function bindEventHandlers(){
    $("#select_tag")
      .keyup(function(e){
        if (e.keyCode === 27 /* Esc */)
          $(this).val("");
      })
      .change(function(e){
        var val = $(this).val();
        if (val !== ""){
          State.addTag(val);
          State.sync();
        }
      });

    $("#clear_filter").click(function(){
      State.setTags([]);
      State.sync();
    });

    $(".note_tag").live("click", function(){
      var $this = $(this);

      var restoreScroll = $this.parent().is('.tags');
      var prevScroll;
      var prevOffset;
      if (restoreScroll){
        prevScroll = $(window).scrollTop();
        prevOffset = $this.offset().top;
      }

      State.toggleTag($this.text(), !$this.hasClass("chosen_tag"));
      State.sync(!restoreScroll);
      if (restoreScroll)
        $(window).scrollTop(prevScroll + $this.offset().top - prevOffset);

      return false;
    });

    getLocalLinks().click(function(e){
      // It's necessary to use these methods instead of returning false.
      // Returning false does not work reliably due to lags caused by
      // the invocation of `replaceState()`
      e.stopPropagation();
      e.preventDefault();

      // Remember this scroll position to restore on Back button click.
      // NOTE: This won't work nicely if user resizes the window.
      var scrollPos = $(window).scrollTop();
      hashchangeHandler.ignoredScroll = scrollPos;
      $.bbq.replaceState({ scroll: scrollPos }, 0);

      State.setAnchor($(this).attr("href").substr(1), State.SCROLL_FORCE);
      State.sync();
    });
  }

  /*
   * Pretty printing of links.
   * http://beckelman.net/post/2009/02/16/Use-jQuery-to-Show-a-Linke28099s-Address-After-its-Text-When-Printing-In-IE6-and-IE7.aspx
   */
  function initPrinting(){
    if (window.onbeforeprint !== undefined){

      window.onbeforeprint = function(){
        getForeignLinks().each(function(){

          //Store the link's original text in the jQuery data store
          $(this).data("linkText", $(this).text());

          //Append the link to the current text
          $(this).append(" (" + $(this).attr("href") + ")");
        });
      };

      window.onafterprint = function(){
        getForeignLinks().each(function(){

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
