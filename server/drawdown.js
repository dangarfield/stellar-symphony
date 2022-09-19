/**
 * drawdown.js
 * (c) Adam Leggett
 */

export default function markdown (src) {
  var rxLt = /</g
  var rxGt = />/g
  var rxSpace = /\t|\r|\uf8ff/g
  var rxEscape = /\\([\\|`*_{}[\]()#+\-~])/g
  var rxHr = /^([*\-=_] *){3,}$/gm
  var rxBlockquote = /\n *&gt; *([^]*?)(?=(\n|$){2})/g
  var rxList = /\n( *)(?:[*\-+]|((\d+)|([a-z])|[A-Z])[.)]) +([^]*?)(?=(\n|$){2})/g
  var rxListjoin = /<\/(ol|ul)>\n\n<\1>/g
  var rxHighlight = /(^|[^A-Za-z\d\\])(([*_])|(~)|(\^)|(--)|(\+\+)|`)(\2?)([^<]*?)\2\8(?!\2)(?=\W|_|$)/g
  var rxCode = /\n((```|~~~).*\n?([^]*?)\n?\2|(( {4}.*?\n)+))/g
  var rxLink = /((!?)\[(.*?)\]\((.*?)( ".*")?\)|\\([\\`*_{}[\]()#+\-.!~]))/g
  var rxTable = /\n(( *\|.*?\| *\n)+)/g
  var rxThead = /^.*\n( *\|( *:?-+:?-+:? *\|)* *\n|)/
  var rxRow = /.*\n/g
  var rxCell = /\||(.*?[^\\])\|/g
  var rxHeading = /(?=^|>|\n)([>\s]*?)(#{1,6}) (.*?)( #*)? *(?=\n|$)/g
  var rxPara = /(?=^|>|\n)\s*\n+([^<]+?)\n+\s*(?=\n|<|$)/g
  var rxStash = /-\d+\uf8ff/g

  function replace (rex, fn) {
    src = src.replace(rex, fn)
  }

  function element (tag, content) {
    return '<' + tag + '>' + content + '</' + tag + '>'
  }

  function blockquote (src) {
    return src.replace(rxBlockquote, function (all, content) {
      return element('blockquote', blockquote(highlight(content.replace(/^ *&gt; */gm, ''))))
    })
  }

  function list (src) {
    return src.replace(rxList, function (all, ind, ol, num, low, content) {
      var entry = element('li', highlight(content.split(
        RegExp('\n ?' + ind + '(?:(?:\\d+|[a-zA-Z])[.)]|[*\\-+]) +', 'g')).map(list).join('</li><li>')))

      return '\n' + (ol
        ? '<ol start="' + (num
          ? ol + '">'
          : parseInt(ol, 36) - 9 + '" style="list-style-type:' + (low ? 'low' : 'upp') + 'er-alpha">') + entry + '</ol>'
        : element('ul', entry))
    })
  }

  function highlight (src) {
    return src.replace(rxHighlight, function (all, _, p1, emp, sub, sup, small, big, p2, content) {
      return _ + element(
        emp ? (p2 ? 'strong' : 'em')
          : sub ? (p2 ? 's' : 'sub')
            : sup ? 'sup'
              : small ? 'small'
                : big ? 'big'
                  : 'code',
        highlight(content))
    })
  }

  function unesc (str) {
    return str.replace(rxEscape, '$1')
  }

  var stash = []
  var si = 0

  src = '\n' + src + '\n'

  replace(rxLt, '&lt;')
  replace(rxGt, '&gt;')
  replace(rxSpace, '  ')

  // blockquote
  src = blockquote(src)

  // horizontal rule
  replace(rxHr, '<hr/>')

  // list
  src = list(src)
  replace(rxListjoin, '')

  // code
  replace(rxCode, function (all, p1, p2, p3, p4) {
    stash[--si] = element('pre', element('code', p3 || p4.replace(/^ {4}/gm, '')))
    return si + '\uf8ff'
  })

  // link or image
  replace(rxLink, function (all, p1, p2, p3, p4, p5, p6) {
    stash[--si] = p4
      ? p2
        ? '<img src="' + p4 + '" alt="' + p3 + '"/>'
        : '<a href="' + p4 + '">' + unesc(highlight(p3)) + '</a>'
      : p6
    return si + '\uf8ff'
  })

  // table
  replace(rxTable, function (all, table) {
    var sep = table.match(rxThead)[1]
    return '\n' + element('table',
      table.replace(rxRow, function (row, ri) {
        return row === sep ? '' : element('tr', row.replace(rxCell, function (all, cell, ci) {
          return ci ? element(sep && !ri ? 'th' : 'td', unesc(highlight(cell || ''))) : ''
        }))
      })
    )
  })

  // heading
  replace(rxHeading, function (all, _, p1, p2) { return _ + element('h' + p1.length, unesc(highlight(p2))) })

  // paragraph
  replace(rxPara, function (all, content) { return element('p', unesc(highlight(content))) })

  // stash
  replace(rxStash, function (all) { return stash[parseInt(all)] })

  return src.trim()
}
