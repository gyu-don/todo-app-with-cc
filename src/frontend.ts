/**
 * フロントエンドHTMLコンテンツ
 *
 * シンプルなReact Todo アプリケーション
 */

export const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo App</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 600px;
            padding: 30px;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }

        .api-key-section {
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .api-key-section label {
            display: block;
            margin-bottom: 5px;
            color: #666;
            font-size: 14px;
        }

        .api-key-section input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }

        .add-form {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }

        .add-form input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }

        .add-form input:focus {
            outline: none;
            border-color: #667eea;
        }

        .add-form button {
            padding: 12px 24px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
        }

        .add-form button:hover {
            background: #5568d3;
        }

        .add-form button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .todo-list {
            list-style: none;
        }

        .todo-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            margin-bottom: 10px;
            background: #f8f9fa;
            border-radius: 8px;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .todo-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .todo-item.completed {
            opacity: 0.6;
        }

        .todo-item input[type="checkbox"] {
            width: 20px;
            height: 20px;
            cursor: pointer;
        }

        .todo-item span {
            flex: 1;
            font-size: 16px;
            color: #333;
        }

        .todo-item.completed span {
            text-decoration: line-through;
            color: #999;
        }

        .todo-item button {
            padding: 6px 12px;
            background: #ff4757;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.3s;
        }

        .todo-item button:hover {
            background: #ee5a6f;
        }

        .todo-item.dragging {
            opacity: 0.5;
        }

        .todo-item.drag-over {
            background: #e0e7ff;
        }

        .error {
            padding: 12px;
            margin-bottom: 15px;
            background: #fee;
            border: 1px solid #fcc;
            border-radius: 6px;
            color: #c33;
            font-size: 14px;
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }

        .empty {
            text-align: center;
            padding: 40px;
            color: #999;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <script type="text/babel">
        const { useState, useEffect } = React;

        // API設定
        const API_BASE = window.location.origin;

        function TodoApp() {
            const [todos, setTodos] = useState([]);
            const [newTodo, setNewTodo] = useState('');
            const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
            const [loading, setLoading] = useState(false);
            const [error, setError] = useState('');
            const [draggedId, setDraggedId] = useState(null);
            const [dragOverIdx, setDragOverIdx] = useState(null);
            const [rollbackTodos, setRollbackTodos] = useState([]);

            // API呼び出しヘルパー
            const apiCall = async (endpoint, options = {}) => {
                if (!apiKey) {
                    throw new Error('API Keyを入力してください');
                }

                const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey,
                        ...options.headers,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || \`エラー: \${response.status}\`);
                }

                if (response.status === 204) {
                    return null;
                }

                return response.json();
            };

            // Todo一覧取得
            const fetchTodos = async () => {
                if (!apiKey) return;

                try {
                    setLoading(true);
                    setError('');
                    const data = await apiCall('/todos');
                    setTodos(data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };

            // Todo追加
            const addTodo = async (e) => {
                e.preventDefault();
                if (!newTodo.trim()) return;

                try {
                    setError('');
                    const todo = await apiCall('/todos', {
                        method: 'POST',
                        body: JSON.stringify({ title: newTodo }),
                    });
                    setTodos([...todos, todo]);
                    setNewTodo('');
                } catch (err) {
                    setError(err.message);
                }
            };

            // Todo更新（完了/未完了切り替え）
            const toggleTodo = async (todo) => {
                try {
                    setError('');
                    const updated = await apiCall(\`/todos/\${todo.id}\`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            title: todo.title,
                            completed: !todo.completed,
                        }),
                    });
                    setTodos(todos.map(t => t.id === todo.id ? updated : t));
                } catch (err) {
                    setError(err.message);
                }
            };

            // Todo削除
            const deleteTodo = async (id) => {
                try {
                    setError('');
                    await apiCall(\`/todos/\${id}\`, { method: 'DELETE' });
                    setTodos(todos.filter(t => t.id !== id));
                } catch (err) {
                    setError(err.message);
                }
            };

            // 並び替えAPI呼び出し
            const reorderTodo = async (id, newPosition) => {
                if (!apiKey) return;
                setError('');
                setRollbackTodos(todos); // Save for rollback
                // 楽観的更新: すぐUI反映
                const optimistic = [...todos];
                const idx = optimistic.findIndex(t => t.id === id);
                if (idx === -1 || optimistic[idx].position === newPosition) return;
                const moved = optimistic.splice(idx, 1)[0];
                optimistic.splice(newPosition, 0, moved);
                // 連続したposition再計算
                const updated = optimistic.map((t, i) => ({ ...t, position: i }));
                setTodos(updated);
                // API呼び出し
                try {
                    await apiCall(\`/todos/\${id}/reorder\`, {
                        method: 'PUT',
                        body: JSON.stringify({ newPosition }),
                    });
                } catch (err) {
                    // ロールバック
                    setTodos(rollbackTodos);
                    setError('並び替え失敗: ' + err.message);
                }
            };

            // ドラッグイベントハンドラ
            const handleDragStart = (id) => setDraggedId(id);
            const handleDragOver = (idx) => setDragOverIdx(idx);
            const handleDragEnd = () => {
                setDraggedId(null);
                setDragOverIdx(null);
            };
            const handleDrop = (idx) => {
                if (draggedId == null || idx == null) return;
                const draggedTodo = todos.find(t => t.id === draggedId);
                if (!draggedTodo || draggedTodo.position === idx) return;
                reorderTodo(draggedId, idx);
                handleDragEnd();
            };

            // API Key保存
            useEffect(() => {
                if (apiKey) {
                    localStorage.setItem('apiKey', apiKey);
                    fetchTodos();
                }
            }, [apiKey]);

            return (
                <div className="container">
                    <h1>📝 Todo App</h1>

                    <div className="api-key-section">
                        <label htmlFor="apiKey">API Key:</label>
                        <input
                            id="apiKey"
                            type="text"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="dev-key-1"
                        />
                    </div>

                    {error && <div className="error">{error}</div>}

                    <form onSubmit={addTodo} className="add-form">
                        <input
                            type="text"
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                            placeholder="新しいTodoを入力..."
                            disabled={!apiKey}
                        />
                        <button type="submit" disabled={!apiKey || !newTodo.trim()}>
                            追加
                        </button>
                    </form>

                    {loading ? (
                        <div className="loading">読み込み中...</div>
                    ) : todos.length === 0 ? (
                        <div className="empty">Todoはありません</div>
                    ) : (
                        <ul className="todo-list">
                            {todos.map((todo, idx) => (
                                <li
                                    key={todo.id}
                                    className={\`todo-item \${todo.completed ? 'completed' : ''} \${draggedId === todo.id ? 'dragging' : ''} \${dragOverIdx === idx ? 'drag-over' : ''}\`}
                                    draggable
                                    onDragStart={() => handleDragStart(todo.id)}
                                    onDragOver={e => { e.preventDefault(); handleDragOver(idx); }}
                                    onDrop={() => handleDrop(idx)}
                                    onDragEnd={handleDragEnd}
                                    style={draggedId === todo.id ? { opacity: 0.5 } : dragOverIdx === idx ? { background: '#e0e7ff' } : {}}
                                >
                                    <input
                                        type="checkbox"
                                        checked={todo.completed}
                                        onChange={() => toggleTodo(todo)}
                                    />
                                    <span>{todo.title}</span>
                                    <button onClick={() => deleteTodo(todo.id)}>
                                        削除
                                    </button>
                                    <button
                                        onClick={() => reorderTodo(todo.id, Math.max(0, todo.position - 1))}
                                        disabled={todo.position === 0}
                                        style={{ marginLeft: '8px', background: '#667eea' }}
                                    >
                                        上へ
                                    </button>
                                    <button
                                        onClick={() => reorderTodo(todo.id, Math.min(todos.length - 1, todo.position + 1))}
                                        disabled={todo.position === todos.length - 1}
                                        style={{ marginLeft: '4px', background: '#667eea' }}
                                    >
                                        下へ
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            );
        }

        ReactDOM.createRoot(document.getElementById('root')).render(<TodoApp />);
    </script>
</body>
</html>`;
