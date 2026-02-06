import React, { useRef, useEffect, useCallback } from 'react';
import { List } from 'lucide-react';

/**
 * 基于 contenteditable 的所见即所得富文本编辑器。
 * 显示渲染后的 HTML，不显示标签符号；工具栏使用 document.execCommand 实现真实格式。
 * Image 功能已移除（避免后端上传依赖）；List 使用浏览器原生列表，无需后端。
 */
const RichTextEditor = ({ value = '', onChange, placeholder, style }) => {
  const editorRef = useRef(null);
  const lastValueRef = useRef(value);
  const savedSelectionRef = useRef(null);

  // 编辑器内选区变化时保存，以便点击工具栏后能恢复选区并执行格式
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (sel.rangeCount && editor.contains(sel.anchorNode)) {
        try {
          savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
        } catch (_) {}
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  // 仅当外部传入的 value 变化时同步到编辑器（如打开不同文章），避免输入时被覆盖；首次挂载若有 value 也要写入
  useEffect(() => {
    const html = value == null ? '' : String(value).trim() || '';
    if (!editorRef.current) return;
    const currentHtml = (editorRef.current.innerHTML || '').trim();
    const valueChanged = html !== lastValueRef.current;
    const needSync = valueChanged || (html && !currentHtml);
    if (needSync) {
      lastValueRef.current = html;
      editorRef.current.innerHTML = html || '';
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (!editorRef.current || !onChange) return;
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html;
    onChange({ target: { value: html } });
  }, [onChange]);

  const restoreSelection = useCallback(() => {
    const saved = savedSelectionRef.current;
    if (!saved || !editorRef.current) return;
    try {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(saved);
    } catch (_) {}
  }, []);

  const applyCommand = useCallback((cmd, valueOrFalse = false) => {
    editorRef.current?.focus();
    restoreSelection();
    try {
      if (valueOrFalse !== false) {
        document.execCommand(cmd, false, valueOrFalse);
      } else {
        document.execCommand(cmd, false);
      }
    } catch (_) {}
    emitChange();
  }, [restoreSelection, emitChange]);

  const handleToolbarMouseDown = (e) => {
    e.preventDefault();
    editorRef.current?.focus();
    restoreSelection();
  };

  return (
    <div className={`border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 flex flex-col ${style || ''}`}>
      <div className="bg-gray-50 border-b p-2 flex flex-wrap gap-1 text-gray-600 select-none">
        <div className="flex gap-0.5 border-r border-gray-200 pr-2 mr-1">
          <button type="button" onMouseDown={handleToolbarMouseDown} onClick={() => applyCommand('formatBlock', 'h1')} className="p-1.5 hover:bg-gray-200 rounded font-bold text-xs" title="一级标题">H1</button>
          <button type="button" onMouseDown={handleToolbarMouseDown} onClick={() => applyCommand('formatBlock', 'h2')} className="p-1.5 hover:bg-gray-200 rounded font-bold text-xs" title="二级标题">H2</button>
        </div>
        <div className="flex gap-0.5 border-r border-gray-200 pr-2 mr-1">
          <button type="button" onMouseDown={handleToolbarMouseDown} onClick={() => applyCommand('bold')} className="p-1.5 hover:bg-gray-200 rounded font-bold" title="加粗">B</button>
          <button type="button" onMouseDown={handleToolbarMouseDown} onClick={() => applyCommand('italic')} className="p-1.5 hover:bg-gray-200 rounded italic" title="斜体">I</button>
        </div>
        <div className="flex gap-0.5">
          <button type="button" onMouseDown={handleToolbarMouseDown} onClick={() => applyCommand('insertUnorderedList')} className="p-1.5 hover:bg-gray-200 rounded" title="无序列表"><List className="h-4 w-4" /></button>
        </div>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="rich-editor-body w-full flex-1 min-h-[12rem] p-4 text-base font-serif leading-loose outline-none bg-white overflow-auto focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5"
        data-placeholder={placeholder || '在此输入文章正文...'}
        onInput={emitChange}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          const html = e.clipboardData.getData('text/html');
          document.execCommand('insertHTML', false, html || text ? (html || text.replace(/\n/g, '<br>')) : '');
          emitChange();
        }}
      />
    </div>
  );
};

export default RichTextEditor;
