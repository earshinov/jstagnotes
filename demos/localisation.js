var L10N = {

  dict: {
    "Tags": "Метки",
    "Hide": "Скрыть",
    "Popular": "Популярные",
    "All": "Все",
    "Filter": "Фильтр",
    "Add from list": "Добавить из списка",
    "Clear": "Очистить"
  },

  dictPlural: {
    "note": ["заметка", "заметки", "заметок"]
  },

  // http://translate.sourceforge.net/wiki/l10n/pluralforms
  plural: function(n){
    return n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2;
  }
};
