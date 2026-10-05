'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Radio, Star } from 'lucide-react';
import { useLanguage } from './LanguageProvider';

type DemoStage = 'ready' | 'rate' | 'tip' | 'thanks' | 'google';

export function InteractiveDemo() {
  const { locale } = useLanguage();
  const [stage, setStage] = useState<DemoStage>('ready');
  const [stars, setStars] = useState(0);
  const [tip, setTip] = useState(0);
  const isArabic = locale === 'ar';

  return (
    <main className="next-demo-shell">
      <section className="next-phone" aria-label={isArabic ? 'عرض تفاعلي لتجربة العميل' : 'Démonstration du parcours client'}>
        <div className="next-phone__screen" aria-live="polite">
          <Link className="product-brand" href="/"><img src="/icons/icon.svg" alt="" />DIGIFEEL</Link>
          {stage === 'ready' && <>
            <span className="next-demo-nfc"><Radio aria-hidden="true" /></span>
            <span className="next-kicker">{isArabic ? 'مطعم تجريبي' : 'RESTAURANT DÉMO'}</span>
            <h1>{isArabic ? 'مطعم لا كويزين' : 'La Cuisine'}</h1>
            <p className="next-muted">{isArabic ? 'المس الشريحة لبدء التجربة.' : 'Simulez un scan pour voir le parcours client.'}</p>
            <button className="product-button product-button--full" type="button" onClick={() => setStage('rate')}>{isArabic ? 'محاكاة المسح' : 'Simuler un scan'} <ArrowRight aria-hidden="true" /></button>
          </>}
          {stage === 'rate' && <>
            <span className="next-kicker">{isArabic ? 'رأيك يهمنا' : 'VOTRE AVIS COMPTE'}</span>
            <h1>{isArabic ? 'كيف كانت وجبتك؟' : 'Comment était votre repas ?'}</h1>
            <p className="next-muted">{isArabic ? 'اختر تقييماً من نجمة إلى خمس.' : 'Choisissez une note de 1 à 5 étoiles.'}</p>
            <div className="next-stars">
              {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value} ${value === 1 ? 'étoile' : 'étoiles'}`} aria-pressed={stars === value} onClick={() => setStars(value)}><Star fill={stars >= value ? 'currentColor' : 'none'} aria-hidden="true" /></button>)}
            </div>
            <button className="product-button product-button--full" type="button" disabled={!stars} onClick={() => setStage('tip')}>{isArabic ? 'متابعة' : 'Continuer'} <ArrowRight aria-hidden="true" /></button>
          </>}
          {stage === 'tip' && <>
            <span className="next-kicker">{isArabic ? 'اختياري' : 'OPTIONNEL'}</span>
            <h1>{isArabic ? 'إكرامية للفريق؟' : 'Un pourboire ?'}</h1>
            <p className="next-muted">{isArabic ? 'المبالغ للعرض فقط ولا يتم أي تحصيل.' : 'Montants de démonstration uniquement : aucun paiement n’est effectué.'}</p>
            <div className="next-stars" role="group" aria-label={isArabic ? 'اختر مبلغاً تجريبياً' : 'Choisir un montant simulé'}>
              {[0, 1, 2, 5].map(value => <button className="next-tip-choice" key={value} type="button" aria-pressed={tip === value} onClick={() => setTip(value)}>{value === 0 ? (isArabic ? 'لا' : 'Non merci') : `${value} €`}</button>)}
            </div>
            <button className="product-button product-button--full" type="button" onClick={() => setStage('thanks')}>{isArabic ? 'متابعة' : 'Continuer'} <ArrowRight aria-hidden="true" /></button>
          </>}
          {stage === 'thanks' && <>
            <Check className="next-review-done__check" aria-hidden="true" size={38} />
            <h1>{isArabic ? 'شكراً على رأيك.' : 'Merci pour votre avis.'}</h1>
            <p className="next-muted">{isArabic ? 'يمكنك الآن مشاركة رأيك على Google.' : `Votre note de ${stars}/5 est enregistrée dans cette démo${tip ? `, avec un choix de pourboire simulé de ${tip} €` : ''}.`}</p>
            <a className="product-button product-button--full" href="https://www.google.com/search?q=La+Cuisine+restaurant+avis" target="_blank" rel="noreferrer">{isArabic ? 'نشر على Google' : 'Publier sur Google'} <ArrowRight aria-hidden="true" /></a>
            <button className="next-link next-switch-button" type="button" onClick={() => setStage('google')}>{isArabic ? 'محاكاة العودة إلى التطبيق' : 'Simuler le retour à Digifeel'}</button>
          </>}
          {stage === 'google' && <>
            <Check className="next-review-done__check" aria-hidden="true" size={38} />
            <h1>{isArabic ? 'اكتملت التجربة.' : 'Parcours terminé.'}</h1>
            <p className="next-muted">{isArabic ? 'تم فتح صفحة Google في علامة تبويب أخرى.' : 'Google s’est ouvert dans un autre onglet. La démo ne publie aucun avis.'}</p>
            <button className="product-button product-button--full" type="button" onClick={() => { setStage('ready'); setStars(0); setTip(0); }}>{isArabic ? 'إعادة التجربة' : 'Recommencer'} <ArrowRight aria-hidden="true" /></button>
          </>}
          {stage !== 'ready' && <button className="next-demo-back" type="button" onClick={() => setStage(stage === 'rate' ? 'ready' : stage === 'tip' ? 'rate' : 'ready')}><ArrowLeft aria-hidden="true" /> {isArabic ? 'رجوع' : 'Retour'}</button>}
        </div>
      </section>
    </main>
  );
}
