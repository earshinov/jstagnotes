VERSION=0.1.0
DOWNLOADS=                                  \
  jstagnotes-all-withExample-${VERSION}.zip \
  jstagnotes-all-${VERSION}.zip             \
  jstagnotes-withExample-${VERSION}.zip     \
  jstagnotes-${VERSION}.zip

.PHONY: all downloads upload clean


all: downloads upload
downloads: ${DOWNLOADS}
clean:
	rm ${DOWNLOADS}

upload: ${DOWNLOADS}
	for d in $?;                                   \
	do                                             \
	  case "$${d}" in                              \
	    jstagnotes-${VERSION}.zip)                 \
	      export SUMMARY='Архив';                  \
	      export LABELS='Featured';                \
	      ;;                                       \
	    jstagnotes-withExample-${VERSION}.zip)     \
	      export SUMMARY='Архив и пример заметок'; \
	      export LABELS='Featured';                \
	      ;;                                       \
	    jstagnotes-all-${VERSION}.zip)             \
	      export SUMMARY='Архив и скрипт преобразования на Python'; \
	      export LABELS='';                           \
	      ;;                                       \
	    jstagnotes-all-withExample-${VERSION}.zip) \
	      export SUMMARY='Архив, скрипт преобразования на Python и пример заметок'; \
	      export LABELS='';                           \
	      ;;                                       \
	    *)                                         \
	      exit 1;                                  \
	      ;;                                       \
	  esac;                                        \
	                                               \
	  ./googlecode-upload.py                       \
	    -u earshinov                               \
	    -p jstagnotes                              \
	    -s "$${SUMMARY}"                           \
	    -l "$${LABELS}"',Type-Archive,OpSys-All'   \
	    "$${d}";                                   \
	done;                                          \

  
jstagnotes-${VERSION}.zip:                  \
  favicon.png                               \
  jquery.js                                 \
  notes3.xsl                                \
  script.js                                 \
  style.css
	mkdir /tmp/jstagnotes/
	cp $^ /tmp/jstagnotes/
	zip -r $@ /tmp/jstagnotes/
	rm -rf /tmp/jstagnotes/
    
jstagnotes-withExample-${VERSION}.zip:      \
  favicon.png                               \
  jquery.js                                 \
  notes3.xsl                                \
  script.js                                 \
  style.css                                 \
  notes3.example.xml
	mkdir /tmp/jstagnotes/
	cp $^ /tmp/jstagnotes/
	zip -r $@ /tmp/jstagnotes/
	rm -rf /tmp/jstagnotes/
    
jstagnotes-all-${VERSION}.zip:              \
  favicon.png                               \
  jquery.js                                 \
  notes3.py                                 \
  notes3.template.xhtml                     \
  notes3.xsl                                \
  script.js                                 \
  style.css
	mkdir /tmp/jstagnotes/
	cp $^ /tmp/jstagnotes/
	zip -r $@ /tmp/jstagnotes/
	rm -rf /tmp/jstagnotes/
    
jstagnotes-all-withExample-${VERSION}.zip:  \
  favicon.png                               \
  jquery.js                                 \
  notes3.py                                 \
  notes3.template.xhtml                     \
  notes3.xsl                                \
  script.js                                 \
  style.css                                 \
  notes3.example.xml
	mkdir /tmp/jstagnotes/
	cp $^ /tmp/jstagnotes/
	zip -r $@ /tmp/jstagnotes/
	rm -rf /tmp/jstagnotes/
