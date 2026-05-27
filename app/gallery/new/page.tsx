'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { supabase } from '../../../lib/supabase';

export default function NewPostPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - images.length;
    const toAdd = files.slice(0, remaining);
    setImages(prev => [...prev, ...toAdd]);
    const newPreviews = toAdd.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !title.trim()) return alert('Name and title are required.');
    setLoading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of images) {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from('gallery-images')
          .upload(fileName, file, { contentType: file.type });
        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('gallery-images')
          .getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error: insertError } = await supabase.from('gallery_posts').insert({
        name: name.trim(),
        title: title.trim(),
        description: description.trim(),
        images: uploadedUrls,
      });

      if (insertError) throw insertError;
      router.push('/gallery');
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Nav />
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">Share Your Glove</h1>
          <p className="text-gray-400 text-sm mt-1">Show the community your custom GN glove.</p>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Your Name / Nickname *</label>
            <input
              className="w-full bg-gray-800 rounded-lg p-3 outline-none text-white"
              placeholder="e.g. Mike K."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Title *</label>
            <input
              className="w-full bg-gray-800 rounded-lg p-3 outline-none text-white"
              placeholder={`e.g. 12" Pitcher - Navy & Gold`}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
            <textarea
              className="w-full bg-gray-800 rounded-lg p-3 outline-none text-white resize-none"
              placeholder="Tell us about your glove — position, web type, color combo..."
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Photos (up to 4)</label>
            {previews.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt={`preview ${i}`} className="w-full object-cover rounded-lg" style={{ height: '140px' }} />
                    <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {images.length < 4 && (
              <label className="block w-full bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-yellow-400 transition-colors">
                <div className="text-2xl mb-1">📷</div>
                <div className="text-gray-400 text-sm">Click to add photos</div>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
              </label>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post →'}
          </button>

          <button onClick={() => router.back()} className="text-gray-500 text-sm text-center hover:text-gray-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}