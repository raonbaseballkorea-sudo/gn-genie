'use client';

import { useState, useEffect } from 'react';
import Nav from '../components/Nav';

interface Post {
  id: number;
  created_at: string;
  name: string;
  email: string;
  title: string;
  content: string;
  reply: string | null;
  replied_at: string | null;
}

export default function QnaPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingId, setReplyingId] = useState<number | null>(null);

  const [form, setForm] = useState({ name: '', email: '', title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const res = await fetch('/api/qna');
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.title || !form.content) {
      alert('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/qna', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.post) {
      setForm({ name: '', email: '', title: '', content: '' });
      setShowForm(false);
      fetchPosts();
    } else {
      alert('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  const handleReply = async (id: number) => {
    if (!replyText.trim()) return;
    const res = await fetch('/api/qna', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reply: replyText, adminPassword }),
    });
    const data = await res.json();
    if (data.post) {
      setReplyText('');
      setReplyingId(null);
      fetchPosts();
    } else {
      alert('Unauthorized or error.');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Nav />

      {/* Header */}
      <section className="px-6 py-10 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-black mb-2">Q&A</h1>
        <p className="text-gray-400">Have a question? Ask away — we'll answer as soon as possible.</p>
      </section>

      {/* Admin Login */}
      <div className="max-w-2xl mx-auto px-6 mb-4 flex justify-end">
        {!adminMode ? (
          <button
            onClick={() => {
              const pw = prompt('Admin password:');
              if (pw) { setAdminPassword(pw); setAdminMode(true); }
            }}
            className="text-xs text-gray-600 hover:text-gray-400"
          >
            Admin
          </button>
        ) : (
          <span className="text-xs text-yellow-400">Admin mode ON</span>
        )}
      </div>

      {/* Write Button */}
      <div className="max-w-2xl mx-auto px-6 mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300"
        >
          {showForm ? 'Cancel' : '✏️ Ask a Question'}
        </button>
      </div>

      {/* Write Form */}
      {showForm && (
        <div className="max-w-2xl mx-auto px-6 mb-8">
          <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
            <input
              className="w-full bg-gray-800 rounded-lg p-3 outline-none text-white"
              placeholder="Your name *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full bg-gray-800 rounded-lg p-3 outline-none text-white"
              placeholder="Your email (optional)"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="w-full bg-gray-800 rounded-lg p-3 outline-none text-white"
              placeholder="Title *"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
            <textarea
              className="w-full bg-gray-800 rounded-lg p-3 outline-none text-white resize-none"
              placeholder="Your question *"
              rows={4}
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-300"
            >
              {submitting ? 'Submitting...' : 'Submit Question'}
            </button>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="max-w-2xl mx-auto px-6 pb-16 space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-500 py-12">No questions yet. Be the first to ask!</div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-gray-900 rounded-2xl overflow-hidden">
              {/* Post Header */}
              <button
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
                onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {post.reply && (
                    <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded flex-shrink-0">
                      Answered
                    </span>
                  )}
                  <span className="text-white font-medium truncate">{post.title}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className="text-gray-500 text-xs">{post.name} · {formatDate(post.created_at)}</span>
                  <span className="text-gray-400">{expandedId === post.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Post Content */}
              {expandedId === post.id && (
                <div className="px-5 pb-5 border-t border-gray-800">
                  <p className="text-gray-300 text-sm leading-relaxed pt-4 whitespace-pre-wrap">{post.content}</p>

                  {/* Reply */}
                  {post.reply && (
                    <div className="mt-4 bg-gray-800 rounded-xl p-4">
                      <div className="text-yellow-400 text-xs font-bold mb-2">
                        GN Glove · {post.replied_at ? formatDate(post.replied_at) : ''}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{post.reply}</p>
                    </div>
                  )}

                  {/* Admin Reply Form */}
                  {adminMode && !post.reply && (
                    <div className="mt-4 space-y-2">
                      <textarea
                        className="w-full bg-gray-800 rounded-lg p-3 outline-none text-white resize-none text-sm"
                        placeholder="Write a reply..."
                        rows={3}
                        value={replyingId === post.id ? replyText : ''}
                        onChange={e => { setReplyingId(post.id); setReplyText(e.target.value); }}
                      />
                      <button
                        onClick={() => handleReply(post.id)}
                        className="bg-yellow-400 text-black font-bold px-6 py-2 rounded-lg text-sm hover:bg-yellow-300"
                      >
                        Post Reply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}