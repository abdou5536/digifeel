import React, { startTransition, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ExternalLink, Star } from 'lucide-react';
import { formatCurrency } from '../utils/currencyUtils';

const TIP_OPTIONS = [0, 2, 5];

const getGoogleReviewHref = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
};

export const CustomerRatingView: React.FC = () => {
  const {
    restaurant,
    waiters,
    selectedWaiterId,
    selectedTableNumber,
    addReview,
    displayCurrency
  } = useApp();

  const isHotel = restaurant.establishmentType === 'hotel';
  const waiter = waiters.find(item => item.id === selectedWaiterId);
  const googleReviewHref = getGoogleReviewHref(restaurant.googleReviewUrl);
  const [rating, setRating] = useState(0);
  const [tip, setTip] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [formError, setFormError] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState('');
  const submissionStarted = useRef(false);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const saveReview = (opensGoogle: boolean) => {
    if (isSubmitted) return;

    startTransition(() => {
      addReview({
        restaurantId: restaurant.id,
        waiterId: waiter?.id || 'waiter-default',
        waiterName: waiter?.name || 'Équipe',
        tableNumber: selectedTableNumber,
        rating,
        compliments: [],
        tipAmount: tip,
        googleReviewClicked: opensGoogle
      });
    });
    setCompletionMessage(
      opensGoogle
        ? 'Votre note est enregistrée. Si Google ne s’est pas ouvert, utilisez le bouton ci-dessous.'
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
    window.setTimeout(() => saveReview(true), 0);
  };

  return (
    <section className="customer-flow" aria-labelledby="customer-flow-title">
      <div className="customer-flow__brand" aria-label={restaurant.name}>
        <span className="customer-flow__wordmark">DIGIFEEL</span>
        <span className="customer-flow__context">
          {isHotel ? `Chambre ${selectedTableNumber}` : `Table ${selectedTableNumber}`}
        </span>
      </div>

      <main className="customer-flow__content">
        {isSubmitted ? (
          <div className="customer-flow__thanks" role="status" aria-live="polite">
            <span className="customer-flow__check" aria-hidden="true">✓</span>
            <h1 id="customer-flow-title">Merci pour votre retour.</h1>
            <p>{completionMessage}</p>
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
              <p className="customer-flow__restaurant">{restaurant.name}</p>
              <h1 id="customer-flow-title">
                {waiter ? `Comment s’est passé le service de ${waiter.name} ?` : 'Comment s’est passée votre visite ?'}
              </h1>
              {!waiter && (
                <p className="customer-flow__notice">
                  Aucun membre de l’équipe n’est associé à ce lien.
                </p>
              )}
            </header>

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
                    {amount === 0 ? 'Non merci' : formatCurrency(amount, displayCurrency)}
                  </motion.button>
                ))}
              </div>
            </fieldset>

            {formError && <p className="customer-flow__notice customer-flow__notice--error" role="alert">{formError}</p>}
            {!isOnline && (
              <p className="customer-flow__notice" role="status">
                Pas de connexion. Votre note sera enregistrée sur cet appareil ; Google ne peut pas s’ouvrir.
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
                  saveReview(false);
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
