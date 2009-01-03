<?xml version='1.0' encoding='utf-8'?>
<xsl:stylesheet version='1.0'
  xmlns:xsl='http://www.w3.org/1999/XSL/Transform'
  xmlns:n='http://mrShadow.habrahabr.ru/notes3/'
  xmlns='http://www.w3.org/1999/xhtml'
  exclude-result-prefixes='n'>
<xsl:output method='html' encoding='utf-8' indent='no'
  doctype-public='-//W3C//DTD HTML 4.01//EN'
  doctype-system='http://www.w3.org/TR/html4/strict.dtd'/>

<xsl:template match='n:notes'>
<html>
  <head>
    <meta http-equiv='Content-Type' content='text/html; charset=utf-8'/>
    
    <title>Заметки</title>
    
    <link rel='shortcut icon' href='favicon.png'/>
    <link rel='stylesheet' type='text/css' href='style.css'/>     
    
    <script type='text/javascript' src='jquery.js'></script>
    <script type='text/javascript' src='script.js'></script>
  </head>
  <body>
    <h1>Заметки</h1>
    
    <div id='tags_header'>
      Метки:
      <a href='' id='toggle_tags'>Скрыть</a>
      <xsl:text> </xsl:text>
      <a href='' id='toggle_popular_tags' class='active_link'>Популярные</a>
      <xsl:text> </xsl:text>
      <a href='' id='toggle_all_tags'>Все</a>
      <div id='popular_tags'/>
      <div id='all_tags'/>
    </div>
    
    <div id='chosen_tags'>
      Фильтр:
    </div>

    <xsl:apply-templates select='n:note'/>    
  </body>
</html>
</xsl:template>
  
<xsl:template match='n:note'>
<div id='notes'>
  <table class='note'>
    <tr>
      <td class='note_header_td'>
        <div class='note_header'>
      
          <xsl:if test='n:date'>
            <div class='note_date'><xsl:value-of select='n:date'/></div>
          </xsl:if>
          
          <div class='note_title'>

            <xsl:choose>
              <xsl:when test='n:link'>
                <a href='{n:link}'><xsl:value-of select='n:title'/></a>
              </xsl:when>
              <xsl:otherwise>
                <xsl:value-of select='n:title'/>
              </xsl:otherwise>
            </xsl:choose>
            
          </div>        
        </div>
      </td>
    </tr>
    <tr>
      <td class='note_contents'><xsl:copy-of select='n:content'/></td>
    </tr>
    <tr>
      <td class='note_tags'>
        <xsl:for-each select='n:tags/n:tag'>
          <a class='note_tag' href=''><xsl:value-of select='.'/></a>
          <xsl:text> </xsl:text>
        </xsl:for-each>
      </td>
    </tr>
  </table>
</div>
</xsl:template>

</xsl:stylesheet>

