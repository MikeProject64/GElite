import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import type { CustomPage as CustomPageType, PageBlock } from '@/types';
import { Header } from '@/components/header';
import { Footer } from '@/components/landing/footer';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';

async function getPageData(slug: string): Promise<CustomPageType | null> {
  const q = query(
    collection(db, 'customPages'),
    where('slug', '==', slug),
    where('isPublic', '==', true),
    limit(1)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const pageDoc = querySnapshot.docs[0];
  const data = pageDoc.data();
  
  // Basic migration for old string-based content
  if (typeof data.content === 'string') {
      data.content = [{ id: 'migrated-content', type: 'text', content: { text: data.content }}];
  }


  return { id: pageDoc.id, ...data } as CustomPageType;
}

function PageBlockRenderer({ block }: { block: PageBlock }) {
    switch (block.type) {
        case 'title':
            return <h1 className="text-4xl font-bold mb-4">{block.content.text}</h1>;
        case 'subtitle':
            return <h2 className="text-2xl font-semibold mb-3">{block.content.text}</h2>;
        case 'text':
            return <p className="mb-4 leading-relaxed">{block.content.text}</p>;
        case 'image':
            return (
                <div className="my-6">
                    <Image
                        src={block.content.src || 'https://placehold.co/800x400.png'}
                        alt={block.content.alt || 'Imagem da página'}
                        width={800}
                        height={400}
                        className="rounded-lg shadow-md object-cover"
                    />
                </div>
            );
        default:
            return null;
    }
}


export default async function CustomPage({ params }: { params: { slug: string } }) {
  const pageData = await getPageData(params.slug);

  if (!pageData) {
    notFound();
  }
  
  // Fetch site settings for header/footer consistency
  let siteName = 'Gestor Elite';
  let iconName = 'Wrench';
  try {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      siteName = data.siteName || 'Gestor Elite';
      iconName = data.iconName || 'Wrench';
    }
  } catch (error) {
    console.error("Failed to fetch settings for custom page:", error);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header siteName={siteName} iconName={iconName} />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-8">
        <article className="prose lg:prose-xl max-w-4xl mx-auto">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6">{pageData.title}</h1>
           {Array.isArray(pageData.content) && pageData.content.map(block => (
               <PageBlockRenderer key={block.id} block={block} />
           ))}
        </article>
      </main>
      <Footer />
    </div>
  );
}

// Optional: Add dynamic metadata for SEO
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const pageData = await getPageData(params.slug);

  if (!pageData) {
    return {
      title: 'Página não encontrada',
    };
  }

  return {
    title: pageData.title,
    // You can also add a description field to your custom pages for better SEO
    // description: pageData.description, 
  };
}
