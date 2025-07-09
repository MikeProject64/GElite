
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import type { CustomPage as CustomPageType } from '@/types';
import { Header } from '@/components/header';
import { Footer } from '@/components/landing/footer';
import { doc, getDoc } from 'firebase/firestore';
import type { UserSettings } from '@/types';
import DOMPurify from 'isomorphic-dompurify';

// This function can be used for Static Site Generation if needed
// export async function generateStaticParams() {
//   const q = query(collection(db, 'customPages'), where('isPublic', '==', true));
//   const querySnapshot = await getDocs(q);
//   return querySnapshot.docs.map((doc) => ({
//     slug: doc.data().slug,
//   }));
// }

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
  return { id: pageDoc.id, ...pageDoc.data() } as CustomPageType;
}

export default async function CustomPage({ params }: { params: { slug: string } }) {
  const pageData = await getPageData(params.slug);

  if (!pageData) {
    notFound();
  }

  // Sanitize the HTML content on the server side
  const cleanHtml = DOMPurify.sanitize(pageData.content);

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
          <h1>{pageData.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
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
