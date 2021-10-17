(() => {
  /**
   * Cached jQuery objects
   */
  let $wrapper;
  let $consoleBody;
  let $resizeBar;
  let $header;
  let $clearBtn;
  let $logs;
  let $footer;
  let $footerGlyph;
  let $codeInput;
  let $expandBtn;

  let resizeStartHeight;
  let resizeStartMousePos;
  let resizing = false;
  let isCollapsed = false;
  let inputHistory = [];
  let inputHistoryPosition = -1;
  let logs = [];

  const captureConsole = () => {
    console.defaultLog = console.log.bind(console);
    console.log = function (...args) {
      addLog('log', args.join(' '));
      console.defaultLog.apply(console, args);
    };

    console.defaultError = console.error.bind(console);
    console.error = function (...args) {
      addLog('error', args.join(' '));
      console.defaultError.apply(console, args);
    };

    console.defaultWarn = console.warn.bind(console);
    console.warn = function (...args) {
      addLog('warn', args.join(' '));
      console.defaultWarn.apply(console, args);
    };

    console.defaultClear = console.clear.bind(console);
    console.clear = function (...args) {
      clearLogs();
      console.defaultClear.apply(console, args);
    };

    window.onerror = function (error) {
      try {
        addLog('error', error);
      } catch (e) {
        console.error(error);
      }
    };
  };

  const build = () => {
    $wrapper = $('<div>').addClass('m3c-wrapper d-none');
    $consoleBody = $('<div>').addClass('m3c-console-body');
    $resizeBar = $('<div>').addClass('m3c-resize');
    $header = $('<div>').addClass('m3c-header').text('Console');
    $clearBtn = $('<div>').addClass('m3c-button').prop('title', 'Clear console').append($('<i>').addClass('fa fa-fw fa-trash'));
    $logs = $('<div>').addClass('m3c-logs');
    $footer = $('<div>').addClass('m3c-footer');
    $footerGlyph = $('<span>').addClass('m3c-code-glyph').append($('<i>').addClass('fa fa-fw fa-angle-right'));
    $codeInput = $('<textarea>').addClass('m3c-input').prop('id', 'm3c-code-input').prop('spellcheck', false);
    $expandBtn = $('<div>').addClass('m3c-button m3c-no-pad').prop('title', 'Collapse').append($('<i>').addClass('fa fa-fw fa-chevron-down'));

    $wrapper.append(
      $consoleBody
        .append($resizeBar)
        .append($header.append($clearBtn))
        .append($logs).append(
          $footer
            .append($footerGlyph)
            .append($codeInput)
            .append($expandBtn)
      ));
  };

  const attachEvents = () => {
    $codeInput.on('input', () => {
      $codeInput.css('height', '23px');
      $codeInput.css('height', `${$codeInput[0].scrollHeight}px`);
    });
  
    // Up key
    $codeInput.on('keydown', e => {
      if (e.keyCode !== 38) return true;
      if ($codeInput[0].selectionStart !== $codeInput[0].selectionEnd) return true;
      const newLineIndex = $codeInput.val().indexOf('\n');
      if (newLineIndex > -1 && $codeInput[0].selectionStart > newLineIndex) return true;
      
      e.preventDefault();
      inputHistoryUp();
      return false;
    });

    // Down key
    $codeInput.on('keydown', e => {
      if (e.keyCode !== 40) return true;
      if ($codeInput[0].selectionStart !== $codeInput[0].selectionEnd) return true;
      const lastNewLineIndex = $codeInput.val().lastIndexOf('\n');
      if (lastNewLineIndex > -1 && $codeInput[0].selectionStart < lastNewLineIndex) return true;
      
      e.preventDefault();
      inputHistoryDown();
      return false;
    });

    // Enter on code input to submit
    $codeInput.on('keydown', e => {
      if (e.keyCode !== 13 || e.shiftKey) return true;
      
      e.preventDefault();
      submitConsole();
      return false;
    });

    $clearBtn.on('click', clearLogs);

    $(document).on('keydown', e => {
      if (e.keyCode !== 192 || !e.shiftKey) return true;

      $wrapper.toggleClass('d-none');
      if ($wrapper.is(':visible')) {
        updateLogUI();
        $(document).one('keyup', () => $codeInput.focus());
      }
    });

    $resizeBar.on('mousedown', e => {
      resizing = true;
      resizeStartHeight = $consoleBody.height();
      resizeStartMousePos = e.clientY;
      $(document).one('mouseup', () => resizing = false);
    });

    $(document).on('mousemove', e => {
      if (!resizing) return true;

      $consoleBody.css('height', `${resizeStartHeight + (resizeStartMousePos - e.clientY)}px`);
    });

    $expandBtn.on('click', e => {
      isCollapsed = !isCollapsed;
      $consoleBody.toggleClass('m3c-fit', isCollapsed);
      $wrapper.toggleClass('m3c-fit', isCollapsed);
      $resizeBar.toggleClass('d-none', isCollapsed);
      $header.toggleClass('d-none', isCollapsed);
      $logs.toggleClass('d-none', isCollapsed);
      $expandBtn.find('i').toggleClass('fa-chevron-up', isCollapsed)
        .toggleClass('fa-chevron-down', !isCollapsed)
        .prop('title', isCollapsed ? 'Expand' : 'Collapse');
    });
  };

  const inject = () => {
    $('#m-page-loader').after($wrapper);
  };

  const inputHistoryUp = () => {
    if (!inputHistory.length) return;
    if (inputHistoryPosition === 0) return;
    inputHistoryPosition = inputHistoryPosition === -1 ? inputHistory.length - 1 : inputHistoryPosition - 1;
    
    $codeInput.val(inputHistory[inputHistoryPosition]);
    $codeInput.trigger('input');
  };

  const inputHistoryDown = () => {
    inputHistoryPosition = inputHistoryPosition === -1 || inputHistoryPosition === (inputHistory.length - 1) ? -1 : inputHistoryPosition + 1;
    
    if (inputHistoryPosition === -1 || !inputHistory.length) {
      $codeInput.val('');
      $codeInput.trigger('input');
      return;
    }
    
    $codeInput.val(inputHistory[inputHistoryPosition]);
    $codeInput.trigger('input');
  };

  const submitConsole = () => {
    addLog('input', $codeInput.val());
    try {
      const res = eval($codeInput.val());
      if (!$codeInput.val().includes('console.clear()'))
        addLog('output', res);
    } catch (e) {
      addLog('error', `${e.name}: ${e.message}`);
    }
    if (inputHistoryPosition !== inputHistory.length - 1 || $codeInput.val() !== inputHistory[inputHistoryPosition])
      inputHistory.push($codeInput.val());
    $codeInput.val('');
    $codeInput.trigger('input');
    inputHistoryPosition = -1;
  };

  const addLog = (type, message) => {
    let formattedMessage;
    switch (typeof message) {
      case 'string':
        formattedMessage = message;
        break;
      case 'number':
        formattedMessage = message.toString();
        break;
      case 'object':
        formattedMessage = JSON.stringify(message);
        break;
      case 'undefined':
        formattedMessage = 'undefined';
        break;
      default:
        formattedMessage = message.toString();
        break;
    }

    logs.push({ type, message: formattedMessage });
    if ($wrapper.is(':visible')) updateLogUI();
  };

  const updateLogUI = () => {
    for (let i = $logs.children().length; i < logs.length; i++) {
      $logs.append(buildLog(logs[i]));
    }
    $logs.scrollTop($logs[0].scrollHeight);
  };

  const buildLog = (log) => {
    const $log = $('<div>').addClass('m3c-log');
    const $iconWrapper = $('<div>').addClass('m3c-log-icon');
    const $icon = $('<i>').addClass('fa fa-fw');
    const $message = $('<div>').addClass('m3c-log-message')
      .html(log.message.replace(/\n/g, '<br />'));
    
    switch (log.type) {
      case 'input':
        $icon.addClass('fa-angle-right');
        break;
      case 'output':
        $icon.addClass('fa-arrow-left fa-xs');
        break;
      case 'error':
        $log.addClass('m3c-log-error');
        $icon.addClass('fa-times-circle fa-xs');
        break;
      case 'warn':
        $log.addClass('m3c-log-warn');
        $icon.addClass('fa-exclamation-triangle fa-xs');
        break;
      default:
        break;
    }

    return $log.append($iconWrapper.append($icon)).append($message);
  };

  const clearLogs = () => {
    logs = [];
    $logs.empty();
  };

  captureConsole();
  build();
  attachEvents();
  inject();
})();