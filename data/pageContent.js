export const DEFAULT_PAGE_CONTENT = {
  about: {
    heroEmoji:    '🥻',
    heroTitle:    'Our Story',
    heroSubtitle: 'Tradition meets elegance',
    sections: [
      {
        heading: 'Born from a love of tradition',
        body: 'Saabi Designes was founded with a heartfelt passion for preserving the beauty of traditional Indian wear. From handwoven sarees to intricately embroidered kurtas, every piece in our collection tells a story of heritage, craftsmanship, and culture.',
      },
      {
        heading: 'Authentic Fabrics, Master Craftsmanship',
        body: 'We source our fabrics directly from renowned weavers across India — Banarasi silks from Varanasi, Kanjivaram from Tamil Nadu, and hand-block printed cottons from Rajasthan. Every thread is chosen with care to bring you clothing that feels as beautiful as it looks.',
      },
      {
        heading: 'Our Promise to You',
        body: 'Whether you\'re shopping for a wedding, festival, or everyday elegance, Saabi Designes ensures the finest quality at honest prices. We offer free delivery on orders over ₹999, easy 30-day returns, and a team that genuinely cares about your experience.',
      },
    ],
    stats: [
      { value: '10K+', label: 'Happy Customers' },
      { value: '300+', label: 'Traditional Styles' },
      { value: '5★',   label: 'Avg. Rating' },
    ],
  },

  contact: {
    heroTitle:    'Get in Touch',
    heroSubtitle: "We're here to help with orders, sizing, and more",
    info: [
      { icon: '📍', label: 'Location', value: 'Chennai, Tamil Nadu, India' },
      { icon: '📞', label: 'Phone',    value: '+91 98765 43210' },
      { icon: '🕐', label: 'Hours',    value: 'Mon–Sat: 9AM – 7PM' },
    ],
  },

  store: {
    brandName:              'Saabi Designes',
    tagline:                'Fashion Boutique',
    email:                  '',
    phone:                  '+91 98765 43210',
    whatsapp:               '',
    instagram:              '',
    freeShippingThreshold:  '999',
    shippingCost:           '99',
    returnDays:             '30',
  },

  checkout: {
    upiVpa:          'saabiboutique@ybl',
    upiMerchantName: 'Saabi Designes',
    enableUpi:       true,
    enableCard:      true,
    enableCod:       true,
    successMessage:  'Your order is confirmed and will be delivered in 5–7 business days.',
    headerTag:       '✦ SAABI DESIGNES ✦',
  },
};
