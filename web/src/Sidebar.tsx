import { useState } from "react";
import type { TreeNode } from "./tree";

interface Props {
  tree: TreeNode;
  activePath: string;
  onOpen: (path: string) => void;
  onNewNote: (dirPrefix: string) => void;
  onNewFolder: (dirPrefix: string) => void;
  onDeleteDir: (path: string) => void;
  onRenameFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
}

export default function Sidebar(props: Props) {
  const { tree, activePath, onNewNote, onNewFolder } = props;

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span className="brand">
          <span className="brand-mark">67</span>notes
        </span>
        <div className="actions">
          <button title="New note" onClick={() => onNewNote("")}>
            ＋
          </button>
          <button title="New folder" onClick={() => onNewFolder("")}>
            📁
          </button>
        </div>
      </div>

      <div className="tree-scroll">
        <ul className="tree">
          {tree.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={0}
              activePath={activePath}
              onOpen={props.onOpen}
              onNewNote={props.onNewNote}
              onNewFolder={props.onNewFolder}
              onDeleteDir={props.onDeleteDir}
              onRenameFile={props.onRenameFile}
              onDeleteFile={props.onDeleteFile}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

function TreeItem({
  node,
  depth,
  activePath,
  onOpen,
  onNewNote,
  onNewFolder,
  onDeleteDir,
  onRenameFile,
  onDeleteFile,
}: {
  node: TreeNode;
  depth: number;
  activePath: string;
} & Pick<
  Props,
  | "onOpen"
  | "onNewNote"
  | "onNewFolder"
  | "onDeleteDir"
  | "onRenameFile"
  | "onDeleteFile"
>) {
  const [open, setOpen] = useState(true);
  const pad = { paddingLeft: 6 + depth * 12 };

  if (node.isDir) {
    return (
      <li>
        <div className="row dir" style={pad}>
          <button className="twisty" onClick={() => setOpen((o) => !o)}>
            {open ? "▾" : "▸"}
          </button>
          <span className="label" onClick={() => setOpen((o) => !o)}>
            {node.name}
          </span>
          <span className="row-actions">
            <button
              title="New note here"
              onClick={() => onNewNote(node.path)}
            >
              ＋
            </button>
            <button
              title="New subfolder"
              onClick={() => onNewFolder(node.path)}
            >
              📁
            </button>
            <button
              title="Delete folder"
              onClick={() => onDeleteDir(node.path)}
            >
              🗑
            </button>
          </span>
        </div>
        {open && (
          <ul>
            {node.children.map((c) => (
              <TreeItem
                key={c.path}
                node={c}
                depth={depth + 1}
                activePath={activePath}
                onOpen={onOpen}
                onNewNote={onNewNote}
                onNewFolder={onNewFolder}
                onDeleteDir={onDeleteDir}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <div
        className={`row file ${activePath === node.path ? "active" : ""}`}
        style={pad}
        onClick={() => onOpen(node.path)}
        title={node.path}
      >
        <span className="label">{node.name}</span>
        <span className="row-actions">
          <button
            title="Rename note"
            onClick={(e) => {
              e.stopPropagation();
              onRenameFile(node.path);
            }}
          >
            ✎
          </button>
          <button
            title="Delete note"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFile(node.path);
            }}
          >
            🗑
          </button>
        </span>
      </div>
    </li>
  );
}
