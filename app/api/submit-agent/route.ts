import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const name = formData.get('name') as string;
    const language = formData.get('language') as string;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string;
    const githubRepo = formData.get('githubRepo') as string;
    const requirements = formData.get('requirements') as string;
    const links = formData.get('links') as string;
    const imageFile = formData.get('image') as File;
    const submittedBy = formData.get('submittedBy') as string;

    // Validate required fields
    if (!name || !language || !description || !tags || !githubRepo || !imageFile || !submittedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse requirements and links from JSON strings
    const requirementsArray = requirements ? JSON.parse(requirements) : [];
    const linksArray = links ? JSON.parse(links) : [];

    // Upload image to Firebase Storage
    const timestamp = Date.now();
    const imageFileName = `agent-images/${submittedBy}-${timestamp}-${imageFile.name}`;
    const storageRef = ref(storage, imageFileName);
    
    const buffer = await imageFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    await uploadBytes(storageRef, bytes, {
      contentType: imageFile.type,
    });
    
    const imageUrl = await getDownloadURL(storageRef);

    // Save to Firebase
    const docRef = await addDoc(collection(db, 'agent-submissions'), {
      name,
      language,
      description,
      tags,
      githubRepo,
      requirements: requirementsArray,
      links: linksArray,
      submittedBy,
      status: 'pending', // pending, approved, rejected
      imageUrl,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      submissionId: docRef.id,
      message: 'Agent submitted for review successfully!',
    });

  } catch (error) {
    console.error('Error submitting agent:', error);
    return NextResponse.json(
      { error: 'Failed to submit agent' },
      { status: 500 }
    );
  }
}
