import React, { startTransition, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Check, Copy, ExternalLink, Star } from 'lucide-react';
import { formatCurrency } from '../utils/currencyUtils';
import { RestaurantConfig } from '../types';

const TIP_OPTIONS = [0, 2, 5];
type CustomerRestaurant = Pick<RestaurantConfig, 'id' | 'name' | 'googleReviewUrl'> & Partial<Pick<RestaurantConfig, 'establishmentType' | 'tipEnabled'>>;

const getGoogleReviewHref = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
};

export const CustomerRatingView: React.FC<{
  restaurantOverride?: CustomerRestaurant;
  tableNumberOverride?: number;
  waiterIdOverride?: string;
  publicTargetId?: string;
}> = ({ restaurantOverride, tableNumberOverride, waiterIdOverride, publicTargetId }) => {
  const {
    restaurant,
    waiters,
    selectedWaiterId,
    selectedTableNumber,
    addReview
  } = useApp();

  const activeRestaurant = restaurantOverride ? { ...restaurant, ...restaurantOverride } : restaurant;
  const activeTableNumber = tableNumberOverride ?? selectedTableNumber;
  const isHotel = activeRestaurant.establishmentType === 'hotel';
  const waiter = waiters.find(item => item.id === (waiterIdOverride || selectedWaiterId));
  const googleReviewHref = getGoogleReviewHref(activeRestaurant.googleReviewUrl);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tip, setTip] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [formError, setFormError] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState('');
  const [commentCopied, setCommentCopied] = useState(false);
  const submissionStarted = useRef(false);
  const reviewDedupeKey = useRef(crypto.randomUUID());
  const [tipCheckoutBusy, setTipCheckoutBusy] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const saveReview = async (opensGoogle: boolean) => {
    if (isSubmitted) return;

    if (publicTargetId && !isOnline) {
      submissionStarted.current = false;
      setFormError('Reconnectez-vous pour envoyer votre avis. Votre texte reste disponible sur cette page.');
      return;
    }

    if (publicTargetId && isOnline) {
      try {
        const response = await fetch('/api/public/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicId: publicTargetId,
            dedupeKey: reviewDedupeKey.current,
            rating,
            comment,
            googleOpened: opensGoogle
          })
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || 'Votre avis n’a pas pu être enregistré.');
      } catch (error) {
        submissionStarted.current = false;
        setFormError(error instanceof Error ? error.message : 'Votre avis n’a pas pu être enregistré.');
        return;
      }
    }

    startTransition(() => {
      addReview({
        restaurantId: activeRestaurant.id,
        waiterId: waiter?.id || 'waiter-default',
        waiterName: waiter?.name || 'Équipe',
        tableNumber: activeTableNumber,
        rating,
        compliments: [],
        tipAmount: tip,
        googleReviewClicked: opensGoogle
      });
    });
    setCompletionMessage(
      opensGoogle
        ? 'Votre retour est enregistré. Si Google ne s’est pas ouvert, utilisez le bouton ci-dessous.'
        : isOnline
          ? 'Votre note est enregistrée. Le lien Google de cet établissement n’est pas configuré.'
          : 'Votre note est enregistrée sur cet appareil. Vous pourrez ouvrir Google quand la connexion sera rétablie.'
    );
    setIsSubmitted(true);
  };

  const handleGoogleReview = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (rating === 0) {
      event.preventDefault();
      setFormError('Choisissez une note pour continuer.');
      return;
    }

    if (submissionStarted.current) {
      event.preventDefault();
      return;
    }

    submissionStarted.current = true;
    setFormError(null);
    void saveReview(true);
  };

  const startTipPayment = async () => {
    if (!publicTargetId || tip <= 0) return;
    setTipCheckoutBusy(true);
    setFormError(null);
    try {
      const response = await fetch('/api/public/tips/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: publicTargetId, amountEuros: tip })
      });
      const result = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error || 'Le paiement du pourboire ne peut pas démarrer.');
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Le paiement du pourboire ne peut pas démarrer.');
      setTipCheckoutBusy(false);
    }
  };

  return (
    <section className="customer-flow" aria-labelledby="customer-flow-title">
      <div className="customer-flow__brand" aria-label={activeRestaurant.name}>
        <span className="customer-flow__wordmark">DIGIFEEL</span>
        <span className="customer-flow__context">
          {isHotel ? `Chambre ${activeTableNumber}` : `Table ${activeTableNumber}`}
        </span>
      </div>

      <main className="customer-flow__content">
        {isSubmitted ? (
          <div className="customer-flow__thanks" role="status" aria-live="polite">
            <span className="customer-flow__check" aria-hidden="true">✓</span>
            <h1 id="customer-flow-title">Merci pour votre retour.</h1>
            <p>{completionMessage}</p>
            {formError && <p className="customer-flow__notice customer-flow__notice--error" role="alert">{formError}</p>}
            {comment.trim() && (
              <button
                type="button"
                className="customer-flow__copy-button"
                onClick={() => {
                  void navigator.clipboard.writeText(comment).then(() => setCommentCopied(true)).catch(error => {
                    console.error('La copie du commentaire a échoué.', error);
                    setFormError('La copie est indisponible dans ce navigateur.');
                  });
                }}
              >
                {commentCopied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
                {commentCopied ? 'Commentaire copié' : 'Copier mon commentaire'}
              </button>
            )}
            {googleReviewHref && isOnline && (
              <motion.a
                className="customer-flow__google-button"
                href={googleReviewHref}
                target="_blank"
                rel="noreferrer"
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.18 }}
              >
                <span>Ouvrir Google</span>
                <ExternalLink aria-hidden="true" size={20} />
              </motion.a>
            )}
          </div>
        ) : (
          <>
            <header className="customer-flow__heading">
              <p className="customer-flow__restaurant">{activeRestaurant.name}</p>
              <h1 id="customer-flow-title">
                {waiter ? `Comment s’est passé le service de ${waiter.name} ?` : 'Comment s’est passée votre visite ?'}
              </h1>
              {!waiter && (
                <p className="customer-flow__notice">
                  Aucun membre de l’équipe n’est associé à ce lien.
                </p>
              )}
            </header>

            <label className="customer-flow__comment-label" htmlFor="customer-review-comment">Votre commentaire (facultatif)</label>
            <textarea
              id="customer-review-comment"
              className="customer-flow__comment"
              maxLength={2000}
              rows={4}
              value={comment}
              onChange={event => setComment(event.target.value)}
              placeholder="Un plat, un accueil ou un détail que vous avez apprécié…"
            />

            <fieldset className="customer-flow__rating">
              <legend>Notez votre expérience</legend>
              <div className="customer-flow__stars">
                {[1, 2, 3, 4, 5].map(value => (
                  <motion.button
                    key={value}
                    type="button"
                    className="customer-flow__star"
                    aria-label={`${value} étoile${value > 1 ? 's' : ''}`}
                    aria-pressed={rating === value}
                    onClick={() => {
                      setRating(value);
                      setFormError(null);
                    }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Star
                      aria-hidden="true"
                      size={34}
                      fill={value <= rating ? 'currentColor' : 'none'}
                    />
                  </motion.button>
                ))}
              </div>
            </fieldset>

            {activeRestaurant.tipEnabled && (
              <fieldset className="customer-flow__tip">
                <legend>Indiquer un pourboire <span>(facultatif)</span></legend>
                <div className="customer-flow__tip-options">
                  {TIP_OPTIONS.map(amount => (
                    <motion.button
                      key={amount}
                      type="button"
                      className={`customer-flow__tip-option${tip === amount ? ' is-selected' : ''}`}
                      aria-pressed={tip === amount}
                      onClick={() => setTip(amount)}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                    >
                      {amount === 0 ? 'Non merci' : formatCurrency(amount, 'EUR')}
                    </motion.button>
                  ))}
                </div>
                <label className="customer-flow__tip-custom">
                  Autre montant en euros
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="1"
                    inputMode="numeric"
                    value={tip || ''}
                    onChange={event => {
                      const value = event.target.value;
                      const amount = Number(value);
                      if (value === '') {
                        setTip(0);
                        setFormError(null);
                      } else if (Number.isInteger(amount) && amount >= 0 && amount <= 500) {
                        setTip(amount);
                        setFormError(null);
                      } else {
                        setTip(0);
                        setFormError('Entrez un montant entier entre 0 et 500 €.');
                      }
                    }}
                  />
                </label>
                {tip > 0 && publicTargetId && (
                  <button className="customer-flow__tip-option is-selected" type="button" disabled={tipCheckoutBusy} onClick={() => void startTipPayment()}>
                    {tipCheckoutBusy ? 'Ouverture du paiement…' : `Payer ${formatCurrency(tip, 'EUR')} par carte`}
                  </button>
                )}
              </fieldset>
            )}

            {formError && <p className="customer-flow__notice customer-flow__notice--error" role="alert">{formError}</p>}
            {!isOnline && (
              <p className="customer-flow__notice" role="status">
                Pas de connexion. Reconnectez-vous pour envoyer votre avis ; Google ne peut pas s’ouvrir hors ligne.
              </p>
            )}
            {isOnline && !googleReviewHref && (
              <p className="customer-flow__notice" role="status">
                Le lien Google de cet établissement n’est pas configuré. Vous pouvez tout de même enregistrer votre note.
              </p>
            )}
            {isOnline && googleReviewHref ? (
              <motion.a
                className="customer-flow__google-button"
                href={googleReviewHref}
                target="_blank"
                rel="noreferrer"
                onClick={handleGoogleReview}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.18 }}
              >
                <span>Laisser mon avis sur Google</span>
                <ExternalLink aria-hidden="true" size={20} />
              </motion.a>
            ) : (
              <motion.button
                className="customer-flow__google-button"
                type="button"
                onClick={() => {
                  if (rating === 0) {
                    setFormError('Choisissez une note pour continuer.');
                    return;
                  }
                  if (submissionStarted.current) return;
                  submissionStarted.current = true;
                  setFormError(null);
                  void saveReview(false);
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.18 }}
              >
                <span>Enregistrer ma note</span>
              </motion.button>
            )}
            <p className="customer-flow__privacy">Votre avis Google reste facultatif.</p>
          </>
        )}
      </main>
    </section>
  );
};
