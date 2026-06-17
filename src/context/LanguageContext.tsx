import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  es: {
    // Navigation
    'nav.home': 'Inicio',
    'nav.about': 'Nosotros',
    'nav.services': 'Servicios',
    'nav.tms': 'EMT/TMS',
    'nav.experience': 'Proceso',
    'nav.testimonials': 'Testimonios',
    'nav.blog': 'Blog',
    'nav.faq': 'FAQ',
    'nav.contact': 'Contacto',

    // Hero
    'hero.title': 'Psicología Clínica Avanzada y Neurociencia Aplicada con EMT/TMS',
    'hero.subtitle': 'Tratamiento especializado para ansiedad, depresión, trauma, regulación emocional y trastornos complejos mediante psicoterapia basada en evidencia y neurotecnología avanzada.',
    'hero.cta': 'Agendar Consulta',
    'hero.whatsapp': 'Hablar por WhatsApp',

    // About
    'about.title': 'Sobre Nosotros',
    'hero.about.subtitle': 'Clínica especializada en salud mental psicología clínica y neurociencia',
    'about.mission': 'Nuestra Misión',
    'about.missionDesc': 'Ofrecer atención psicológica de excelencia, integrando la neurociencia más avanzada con la psicoterapia basada en evidencia para transformar la vida de nuestros pacientes.',
    'about.approach': 'Nuestro Enfoque',
    'about.approachDesc': 'Combinamos rigor científico, calidez humana y tecnología de vanguardia para brindarte el tratamiento más efectivo disponible actualmente.',
    'about.values.title': 'Nuestros Valores',
    'about.values.evidence': 'Medicina Basada en Evidencia',
    'about.values.evidenceDesc': 'Respaldamos cada tratamiento en investigación científica rigurosa y protocolos clínicos validados internacionalmente.',
    'about.values.ethics': 'Ética Profesional',
    'about.values.ethicsDesc': 'Mantenemos los más altos estándares de práctica profesional, honestidad y responsabilidad clínica.',
    'about.values.confidentiality': 'Confidencialidad Absoluta',
    'about.values.confidentialityDesc': 'Tu privacidad es sagrada. Garantizamos la protección total de tu información personal y clínica.',
    'about.values.personalized': 'Tratamiento Individualizado',
    'about.values.personalizedDesc': 'Desarrollamos planes de tratamiento únicos adaptados a tus necesidades específicas y objetivos terapéuticos.',
    'about.values.neuroscience': 'Neurociencia Aplicada',
    'about.values.neuroscienceDesc': 'Integramos los avances más recientes en neurociencia para optimizar los resultados terapéuticos.',
    'about.values.empathy': 'Empatía Clínica',
    'about.values.empathyDesc': 'Te acompañamos con comprensión profunda, respeto y calidez genuina en cada paso de tu proceso.',

    // Services
    'services.title': 'Servicios Especializados',
    'services.subtitle': 'Tratamientos basados en evidencia científica para transformar tu bienestar mental',
    'services.anxiety': 'Ansiedad',
    'services.anxietyDesc': 'Tratamiento especializado para trastornos de ansiedad generalizada, social, pánico y fobias. Protocolos basados en evidencia con enfoque cognitivo-conductual integrado.',
    'services.depression': 'Depresión',
    'services.depressionDesc': 'Intervención terapéutica para depresión mayor, distimia y depresión resistente al tratamiento. Combinamos psicoterapia y EMT/TMS según necesidades.',
    'services.trauma': 'Trauma y TEPT',
    'services.traumaDesc': 'Tratamiento especializado en trauma complejo y trastorno de estrés postraumático utilizando EMDR, terapia cognitiva y enfoques de neurociencia aplicada.',
    'services.emotional': 'Regulación Emocional',
    'services.emotionalDesc': 'Desarrollo de habilidades para manejar emociones intensas, ideal para trastorno límite de la personalidad, impulsividad y desregulación emocional.',
    'services.stress': 'Estrés y Burnout',
    'services.stressDesc': 'Tratamiento integral para síndrome de burnout, estrés laboral crónico y agotamiento emocional con técnicas de recuperación comprobadas.',
    'services.adhd': 'TDAH',
    'services.adhdDesc': 'Evaluación y tratamiento integral para trastorno por déficit de atención e hiperactividad en adultos. Intervención farmacológica y psicoterapéutica coordinada.',
    'services.bpd': 'Trastorno Límite de la Personalidad',
    'services.bpdDesc': 'Tratamiento especializado con terapia dialéctico-conductual y enfoques integrativos para trastorno límite de la personalidad.',
    'services.ocd': 'TOC',
    'services.ocdDesc': 'Tratamiento para trastorno obsesivo-compulsivo con terapia de exposición y prevención de respuesta, complementada con EMT/TMS cuando está indicado.',
    'services.evaluation': 'Evaluación Psicológica',
    'services.evaluationDesc': 'Evaluaciones completas para diagnóstico, orientación vocacional, valoración forense y evaluación de trastornos específicos.',
    'services.online': 'Terapia Online',
    'services.onlineDesc': 'Atención psicológica a distancia con la misma calidad y efectividad que la presencial. Plataforma segura y confidencial.',
    'services.executive': 'Atención Ejecutiva',
    'services.executiveDesc': 'Servicios premium para ejecutivos y profesionales de alto nivel con disponibilidad prioritaria y horarios flexibles.',
    'services.cta': 'Solicitar Información',

    // TMS/EMT
    'tms.title': 'Estimulación Magnética Transcraneal',
    'tms.subtitle': 'Tecnología de vanguardia para tratar condiciones resistentes con neurociencia aplicada',
    'tms.whatIs': '¿Qué es la EMT/TMS?',
    'tms.whatIsDesc': 'La Estimulación Magnética Transcraneal (EMT/TMS) es una técnica de neuromodulación no invasiva que utiliza campos magnéticos para estimular áreas específicas del cerebro involucradas en la regulación del estado de ánimo y las emociones.',
    'tms.howItWorks': '¿Cómo Funciona?',
    'tms.howItWorksDesc': 'Un dispositivo especializado genera pulsos magnéticos focalizados que atraviesan el cráneo y estimulan las neuronas en regiones específicas del cerebro, como la corteza prefrontal dorsolateral, activando circuitos neuronales que regulan el estado de ánimo.',
    'tms.neuroplasticity': 'Neuroplasticidad',
    'tms.neuroplasticityDesc': 'La estimulación repetida promueve la neuroplasticidad: la capacidad del cerebro de crear nuevas conexiones neuronales y fortalecer circuitos atenuados por la depresión u otras condiciones.',
    'tms.integration': 'Integración con Psicoterapia',
    'tms.integrationDesc': 'Combinamos EMT/TMS con psicoterapia para maximizar resultados: la neuromodulación optimiza la actividad cerebral mientras la terapia desarrolla herramientas cognitivas y emocionales duraderas.',
    'tms.conditionsStrong': 'Condiciones con Evidencia Sólida',
    'tms.conditionsResearch': 'Condiciones en Investigación Activa',
    'tms.benefits': 'Beneficios del Tratamiento',
    'tms.benefit.nonInvasive': 'No Invasivo',
    'tms.benefit.nonInvasiveDesc': 'No requiere cirugía ni implantes. El tratamiento se realiza de forma ambulatoria.',
    'tms.benefit.noAnesthesia': 'Sin Anestesia',
    'tms.benefit.noAnesthesiaDesc': 'El paciente permanece completamente despierto y alerta durante toda la sesión.',
    'tms.benefit.outpatient': 'Ambulatorio',
    'tms.benefit.outpatientDesc': 'Sin hospitalización. Puedes continuar tus actividades normales inmediatamente.',
    'tms.benefit.tolerated': 'Bien Tolerado',
    'tms.benefit.toleratedDesc': 'Efectos secundarios mínimos en comparación con tratamientos farmacológicos.',
    'tms.benefit.noSystemic': 'Sin Efectos Sistémicos',
    'tms.benefit.noSystemicDesc': 'El tratamiento es localizado, sin dispersión a otros órganos o sistemas.',
    'tms.benefit.compatible': 'Compatible con Terapia',
    'tms.benefit.compatibleDesc': 'Se puede combinar con psicoterapia y otros tratamientos simultáneamente.',

    // Experience
    'experience.title': 'Experiencia del Paciente',
    'experience.subtitle': 'Tu camino hacia el bienestar mental en 6 pasos',
    'experience.step1': 'Solicita Información',
    'experience.step1Desc': 'Contáctanos por WhatsApp o formulario. Responderemos todas tus dudas sobre nuestros servicios y proceso de atención.',
    'experience.step2': 'Agenda tu Consulta',
    'experience.step2Desc': 'Coordinamos una cita inicial según tu disponibilidad. Ofrecemos horarios flexibles y atención prioritaria.',
    'experience.step3': 'Evaluación Clínica Integral',
    'experience.step3Desc': 'Realizamos una evaluación completa de tu situación, historia clínica y necesidades específicas de tratamiento.',
    'experience.step4': 'Plan Personalizado',
    'experience.step4Desc': 'Diseñamos un plan de tratamiento individualizado con objetivos claros y estrategias basadas en evidencia.',
    'experience.step5': 'Psicoterapia y/o EMT/TMS',
    'experience.step5Desc': 'Iniciamos el tratamiento indicado según tu plan, ya sea psicoterapia, EMT/TMS o combinación de ambos.',
    'experience.step6': 'Seguimiento Continuo',
    'experience.step6Desc': 'Evaluamos progreso regularmente, ajustando el tratamiento según tu evolución y necesidades cambiantes.',

    // Testimonials
    'testimonials.title': 'Testimonios',
    'testimonials.subtitle': 'Experiencias de pacientes que transformaron su bienestar mental',
    'testimonials.disclaimer': 'La experiencia puede variar según cada paciente. Testimonios con fines ilustrativos.',

    // Blog
    'blog.title': 'Blog Científico',
    'blog.subtitle': 'Artículos sobre salud mental, neurociencia tratamientos basados en evidencia',
    'blog.readMore': 'Leer Más',

    // FAQ
    'faq.title': 'Preguntas Frecuentes',
    'faq.subtitle': 'Respuestas a las dudas más comunes sobre nuestros servicios',
    'faq.psychotherapy': 'Psicoterapia',
    'faq.anxiety': 'Ansiedad',
    'faq.depression': 'Depresión',
    'faq.tms': 'EMT/TMS',
    'faq.appointments': 'Citas',
    'faq.whatsapp': 'WhatsApp',

    // Contact
    'contact.title': 'Contacto',
    'contact.subtitle': 'Estamos aquí para ayudarte. Contáctanos cuando estés listo.',
    'contact.form.name': 'Tu Nombre',
    'contact.form.email': 'Correo Electrónico',
    'contact.form.phone': 'Teléfono',
    'contact.form.subject': 'Asunto',
    'contact.form.message': 'Tu Mensaje',
    'contact.form.submit': 'Enviar Mensaje',
    'contact.form.sending': 'Enviando...',
    'contact.form.success': '¡Mensaje enviado! Te contactaremos pronto.',
    'contact.whatsapp': 'WhatsApp',
    'contact.phone': 'Teléfono',
    'contact.hours': 'Horarios de Atención',
    'contact.hoursWeekday': 'Lunes - Viernes: 9:00 AM - 7:00 PM',
    'contact.hoursSaturday': 'Sábado: 9:00 AM - 3:00 PM',
    'contact.location': 'Ubicación',
    'contact.locationDesc': '5 de Febrero esq. Benito Juárez, Centro. Xalapa, Veracruz-Puebla.',

    // Footer
    'footer.disclaimer': 'La información proporcionada en este sitio es únicamente con fines educativos no sustituye el diagnóstico o tratamiento profesional. Consulte a un profesional de salud mental calificado.',
    'footer.privacy': 'Política de Privacidad',
    'footer.terms': 'Términos y Condiciones',
    'footer.rights': 'Todos los derechos reservados.',

    // Common
    'common.learnMore': 'Más Información',
    'common.schedule': 'Agendar Consulta',
    'common.viewAll': 'Ver Todos',
    'common.back': 'Regresar',
    'common.locale': 'Atención en Xalapa, Puebla y la región de Veracruz-Puebla',
  },

  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.about': 'About Us',
    'nav.services': 'Services',
    'nav.tms': 'TMS',
    'nav.experience': 'Process',
    'nav.testimonials': 'Testimonials',
    'nav.blog': 'Blog',
    'nav.faq': 'FAQ',
    'nav.contact': 'Contact',

    // Hero
    'hero.title': 'Advanced Clinical Psychology and Applied Neuroscience with TMS',
    'hero.subtitle': 'Specialized treatment for anxiety, depression, trauma, emotional regulation and complex disorders through evidence-based psychotherapy and advanced neurotechnology.',
    'hero.cta': 'Schedule Consultation',
    'hero.whatsapp': 'Chat on WhatsApp',

    // About
    'about.title': 'About Us',
    'hero.about.subtitle': 'Clinic specialized in mental health, clinical psychology and neuroscience',
    'about.mission': 'Our Mission',
    'about.missionDesc': 'To provide excellent psychological care, integrating the most advanced neuroscience with evidence-based psychotherapy to transform our patients\' lives.',
    'about.approach': 'Our Approach',
    'about.approachDesc': 'We combine scientific rigor, human warmth and cutting-edge technology to provide the most effective treatment currently available.',
    'about.values.title': 'Our Values',
    'about.values.evidence': 'Evidence-Based Medicine',
    'about.values.evidenceDesc': 'We back every treatment with rigorous scientific research and internationally validated clinical protocols.',
    'about.values.ethics': 'Professional Ethics',
    'about.values.ethicsDesc': 'We maintain the highest standards of professional practice, honesty and clinical responsibility.',
    'about.values.confidentiality': 'Absolute Confidentiality',
    'about.values.confidentialityDesc': 'Your privacy is sacred. We guarantee total protection of your personal and clinical information.',
    'about.values.personalized': 'Individualized Treatment',
    'about.values.personalizedDesc': 'We develop unique treatment plans adapted to your specific needs and therapeutic goals.',
    'about.values.neuroscience': 'Applied Neuroscience',
    'about.values.neuroscienceDesc': 'We integrate the most recent advances in neuroscience to optimize therapeutic outcomes.',
    'about.values.empathy': 'Clinical Empathy',
    'about.values.empathyDesc': 'We accompany you with deep understanding, respect and genuine warmth at every step of your process.',

    // Services
    'services.title': 'Specialized Services',
    'services.subtitle': 'Evidence-based treatments to transform your mental wellbeing',
    'services.anxiety': 'Anxiety',
    'services.anxietyDesc': 'Specialized treatment for generalized anxiety, social anxiety, panic disorders and phobias. Evidence-based protocols with integrated cognitive-behavioral approach.',
    'services.depression': 'Depression',
    'services.depressionDesc': 'Therapeutic intervention for major depression, dysthymia and treatment-resistant depression. We combine psychotherapy and TMS as needed.',
    'services.trauma': 'Trauma & PTSD',
    'services.traumaDesc': 'Specialized treatment for complex trauma and post-traumatic stress disorder using EMDR, cognitive therapy and applied neuroscience approaches.',
    'services.emotional': 'Emotional Regulation',
    'services.emotionalDesc': 'Development of skills to manage intense emotions, ideal for borderline personality disorder, impulsivity and emotional dysregulation.',
    'services.stress': 'Stress & Burnout',
    'services.stressDesc': 'Comprehensive treatment for burnout syndrome, chronic work stress and emotional exhaustion with proven recovery techniques.',
    'services.adhd': 'ADHD',
    'services.adhdDesc': 'Comprehensive evaluation and treatment for adult ADHD. Coordinated pharmacological and psychotherapeutic intervention.',
    'services.bpd': 'Borderline Personality Disorder',
    'services.bpdDesc': 'Specialized treatment with dialectical behavior therapy and integrative approaches for borderline personality disorder.',
    'services.ocd': 'OCD',
    'services.ocdDesc': 'Treatment for obsessive-compulsive disorder with exposure and response prevention therapy, complemented with TMS when indicated.',
    'services.evaluation': 'Psychological Evaluation',
    'services.evaluationDesc': 'Complete evaluations for diagnosis, vocational guidance, forensic assessment and specific disorder evaluation.',
    'services.online': 'Online Therapy',
    'services.onlineDesc': 'Remote psychological care with the same quality and effectiveness as in-person. Secure and confidential platform.',
    'services.executive': 'Executive Care',
    'services.executiveDesc': 'Premium services for executives and high-level professionals with priority availability and flexible schedules.',
    'services.cta': 'Request Information',

    // TMS/EMT
    'tms.title': 'Transcranial Magnetic Stimulation',
    'tms.subtitle': 'Cutting-edge technology to treat resistant conditions with applied neuroscience',
    'tms.whatIs': 'What is TMS?',
    'tms.whatIsDesc': 'Transcranial Magnetic Stimulation (TMS) is a non-invasive neuromodulation technique that uses magnetic fields to stimulate specific brain areas involved in mood and emotion regulation.',
    'tms.howItWorks': 'How Does It Work?',
    'tms.howItWorksDesc': 'A specialized device generates focused magnetic pulses that penetrate the skull and stimulate neurons in specific brain regions, such as the dorsolateral prefrontal cortex, activating neural circuits that regulate mood.',
    'tms.neuroplasticity': 'Neuroplasticity',
    'tms.neuroplasticityDesc': 'Repeated stimulation promotes neuroplasticity: the brain\'s ability to create new neural connections and strengthen circuits attenuated by depression or other conditions.',
    'tms.integration': 'Integration with Psychotherapy',
    'tms.integrationDesc': 'We combine TMS with psychotherapy to maximize results: neuromodulation optimizes brain activity while therapy develops lasting cognitive and emotional tools.',
    'tms.conditionsStrong': 'Conditions with Solid Evidence',
    'tms.conditionsResearch': 'Conditions in Active Research',
    'tms.benefits': 'Treatment Benefits',
    'tms.benefit.nonInvasive': 'Non-Invasive',
    'tms.benefit.nonInvasiveDesc': 'No surgery or implants required. Treatment is performed on an outpatient basis.',
    'tms.benefit.noAnesthesia': 'No Anesthesia',
    'tms.benefit.noAnesthesiaDesc': 'The patient remains completely awake and alert throughout the session.',
    'tms.benefit.outpatient': 'Outpatient',
    'tms.benefit.outpatientDesc': 'No hospitalization. You can continue normal activities immediately.',
    'tms.benefit.tolerated': 'Well Tolerated',
    'tms.benefit.toleratedDesc': 'Minimal side effects compared to pharmacological treatments.',
    'tms.benefit.noSystemic': 'No Systemic Effects',
    'tms.benefit.noSystemicDesc': 'Treatment is localized, without dispersion to other organs or systems.',
    'tms.benefit.compatible': 'Therapy Compatible',
    'tms.benefit.compatibleDesc': 'Can be combined with psychotherapy and other treatments simultaneously.',

    // Experience
    'experience.title': 'Patient Experience',
    'experience.subtitle': 'Your path to mental wellbeing in 6 steps',
    'experience.step1': 'Request Information',
    'experience.step1Desc': 'Contact us via WhatsApp or form. We will answer all your questions about our services and care process.',
    'experience.step2': 'Schedule Appointment',
    'experience.step2Desc': 'We coordinate an initial appointment according to your availability. We offer flexible hours and priority care.',
    'experience.step3': 'Comprehensive Clinical Evaluation',
    'experience.step3Desc': 'We perform a complete evaluation of your situation, clinical history and specific treatment needs.',
    'experience.step4': 'Personalized Plan',
    'experience.step4Desc': 'We design an individualized treatment plan with clear objectives and evidence-based strategies.',
    'experience.step5': 'Psychotherapy and/or TMS',
    'experience.step5Desc': 'We begin the indicated treatment according to your plan, whether psychotherapy, TMS or a combination of both.',
    'experience.step6': 'Continuous Follow-up',
    'experience.step6Desc': 'We regularly evaluate progress, adjusting treatment according to your evolution and changing needs.',

    // Testimonials
    'testimonials.title': 'Testimonials',
    'testimonials.subtitle': 'Experiences from patients who transformed their mental wellbeing',
    'testimonials.disclaimer': 'Experience may vary per patient. Testimonials are for illustrative purposes.',

    // Blog
    'blog.title': 'Scientific Blog',
    'blog.subtitle': 'Articles about mental health, neuroscience and evidence-based treatments',
    'blog.readMore': 'Read More',

    // FAQ
    'faq.title': 'Frequently Asked Questions',
    'faq.subtitle': 'Answers to the most common questions about our services',
    'faq.psychotherapy': 'Psychotherapy',
    'faq.anxiety': 'Anxiety',
    'faq.depression': 'Depression',
    'faq.tms': 'TMS',
    'faq.appointments': 'Appointments',
    'faq.whatsapp': 'WhatsApp',

    // Contact
    'contact.title': 'Contact',
    'contact.subtitle': 'We are here to help you. Contact us when you are ready.',
    'contact.form.name': 'Your Name',
    'contact.form.email': 'Email',
    'contact.form.phone': 'Phone',
    'contact.form.subject': 'Subject',
    'contact.form.message': 'Your Message',
    'contact.form.submit': 'Send Message',
    'contact.form.sending': 'Sending...',
    'contact.form.success': 'Message sent! We will contact you soon.',
    'contact.whatsapp': 'WhatsApp',
    'contact.phone': 'Phone',
    'contact.hours': 'Office Hours',
    'contact.hoursWeekday': 'Monday - Friday: 9:00 AM - 7:00 PM',
    'contact.hoursSaturday': 'Saturday: 9:00 AM - 3:00 PM',
    'contact.location': 'Location',
    'contact.locationDesc': '5 de Febrero cor. Benito Juárez, Centro. Xalapa, Veracruz-Puebla.',

    // Footer
    'footer.disclaimer': 'The information provided on this site is for educational purposes only and does not substitute professional diagnosis or treatment. Consult a qualified mental health professional.',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms and Conditions',
    'footer.rights': 'All rights reserved.',

    // Common
    'common.learnMore': 'Learn More',
    'common.schedule': 'Schedule Consultation',
    'common.viewAll': 'View All',
    'common.back': 'Back',
    'common.locale': 'Care in Xalapa, Puebla and the Veracruz-Puebla region',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
