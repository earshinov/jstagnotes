#!/usr/bin/env python
# -*- coding: utf-8 -*-

#
# REQUIREMENTS:
#
#   python-lxml
#   python-mako
# 

import sys

from lxml import etree

from mako import exceptions
from mako.template import Template


N = '{http://mrShadow.habrahabr.ru/notes3/}'


def make_tags(tags):
  for tag in tags.iterchildren(N + 'tag'):
    yield unicode(tag.text)


def make_note(note):
  class __Note(object):
  
    def __init__(self, note):
      self.note = note
  
    def _get_title(self):
      return unicode(self.note.find(N + 'title').text)
    title = property(_get_title)
    
    def _get_link(self):
      node = self.note.find(N + 'link')
      if node is None:
        return None
      return unicode(node.text)
    link = property(_get_link)
    
    def _get_date(self):
      node = self.note.find(N + 'date')
      if node is None:
        return None
      return unicode(node.text)
    date = property(_get_date)
    
    def _get_content(self):
      node = self.note.find(N + 'content')
      if node.text is not None:
        result = unicode(node.text)
      else:
        result = u''
      for element in node.iterchildren():
        result += unicode(etree.tostring(element, encoding='utf-8'), 'utf-8')
      return result
    content = property(_get_content)
    
    def _get_tags(self):
      return make_tags(self.note.find(N + 'tags'))
    tags = property(_get_tags)
    
  return __Note(note)


def make_notes():
  tree = etree.parse(sys.stdin)
  root = tree.getroot()
  for note in root.iterchildren(N + 'note'):
    yield make_note(note)
  

if __name__ == '__main__':
  if len(sys.argv) != 2:
    print >> sys.stderr, 'Usage: python notes3.py TEMPLATE_FILE_NAME < XML_INPUT > HTML OUTPUT'
    exit(1)

  template = Template(filename=sys.argv[1], module_directory='/tmp/mako_modules')
  print template.render_unicode(title=u'Заметки', notes=make_notes()).encode('utf-8')

