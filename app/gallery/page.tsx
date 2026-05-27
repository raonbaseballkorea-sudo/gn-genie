'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Nav from '../components/Nav';
import { supabase } from '../../lib/supabase';

interface Post {
  id: string;
  name: string;
  title: string;
  description: string;
  images: string[];
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  name: string;
  content: string;
  created_at: string;
}

export default function GalleryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [commentInput, setCommentInput] = useState<{ [postId: string]: { name: string; content: string } }>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<{ [postId: string]: boolean }>({});

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('gallery_posts')
      .select('*')
      .order('created_at', { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  const fetchComments = async (postId: string) => {
    const { data } = await supabase
      .from('gallery_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments(prev => ({ ...prev, [postId]: data || [] }));
  };

  const toggleComments = async (postId: string) => {
    const next = !showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: next }));
    if (next && !comments[postId]) {
      await fetchComments(postId);
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    const input = commentInput[postId];
    if (!input?.name?.trim() || !input?.content?.trim()) return;
    setSubmitting(postId);
    const { error } = await supabase.from('gallery_comments').insert({
      post_id: postId,
      name: input.name.trim(),
      content: input.content.trim(),
    });
    if (!error) {
      setCommentInput(prev => ({ ...prev, [postId]: { name: input.name, content: '' } }));
      await fetchComments(postId);
    }
    setSubmitting(null);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Nav />

      {modalImage && (
        <div onClick={() => setModalImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'pointer', padding: '20px' }}>
          <img src={modalImage} alt="full" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setModalImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-2">Real Gloves · Real Players</div>
            <h1 className="text-3xl font-black text-white">Gallery</h1>
            <p className="text-gray-400 text-sm mt-1">Share your GN glove with the community.</p>
          </div>
          <Link href="/gallery/new" className="bg-yellow-400 text-black font-bold px-4 py-2 rounded-xl hover:bg-yellow-300 text-sm">
            + Post
          </Link>
        </div>

        {loading ? (
          <div className="text-gray-400 text-center py-20">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🧤</div>
            <p className="text-gray-400">No posts yet. Be the first!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map(post => (
              <div key={post.id} className="bg-gray-900 rounded-2xl overflow-hidden">
                {post.images.length > 0 && (
                  post.images.length === 1 ? (
                    <img
                      src={post.images[0]}
                      alt={post.title}
                      className="w-full object-cover cursor-pointer"
                      style={{ maxHeight: '420px' }}
                      onClick={() => setModalImage(post.images[0])}
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {post.images.slice(0, 4).map((img, i) => (
                        <img key={i} src={img} alt={`${post.title} ${i + 1}`}
                          className="w-full object-cover cursor-pointer"
                          style={{ height: '200px' }}
                          onClick={() => setModalImage(img)} />
                      ))}
                    </div>
                  )
                )}
                <div className="p-5">
                  <h2 className="text-lg font-bold text-white mb-1">{post.title}</h2>
                  {post.description && <p className="text-gray-400 text-sm leading-relaxed mb-3">{post.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 text-sm font-medium">{post.name}</span>
                    <span className="text-gray-600 text-xs">{formatDate(post.created_at)}</span>
                  </div>

                  {/* 댓글 토글 버튼 */}
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="mt-4 text-xs text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    💬 {showComments[post.id] ? 'Hide' : 'Comments'} {comments[post.id]?.length ? `(${comments[post.id].length})` : ''}
                  </button>

                  {/* 댓글 섹션 */}
                  {showComments[post.id] && (
                    <div className="mt-4 border-t border-gray-800 pt-4">
                      {/* 댓글 목록 */}
                      <div className="flex flex-col gap-3 mb-4">
                        {(comments[post.id] || []).length === 0 ? (
                          <p className="text-gray-600 text-xs">No comments yet.</p>
                        ) : (
                          (comments[post.id] || []).map(comment => (
                            <div key={comment.id} className="bg-gray-800 rounded-xl px-4 py-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-yellow-400 text-xs font-bold">{comment.name}</span>
                                <span className="text-gray-600 text-xs">{formatDate(comment.created_at)}</span>
                              </div>
                              <p className="text-gray-300 text-sm">{comment.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* 댓글 입력 */}
                      <div className="flex flex-col gap-2">
                        <input
                          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none text-white"
                          placeholder="Your name"
                          value={commentInput[post.id]?.name || ''}
                          onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: { ...prev[post.id], name: e.target.value } }))}
                        />
                        <div className="flex gap-2">
                          <input
                            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none text-white"
                            placeholder="Write a comment..."
                            value={commentInput[post.id]?.content || ''}
                            onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: { ...prev[post.id], content: e.target.value } }))}
                            onKeyDown={e => e.key === 'Enter' && handleCommentSubmit(post.id)}
                          />
                          <button
                            onClick={() => handleCommentSubmit(post.id)}
                            disabled={submitting === post.id}
                            className="bg-yellow-400 text-black font-bold px-4 rounded-lg text-sm hover:bg-yellow-300 disabled:opacity-50"
                          >
                            {submitting === post.id ? '...' : 'Post'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}