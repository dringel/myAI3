import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { OWNER_NAME } from "@/config";

export default function Terms() {
    return (
        <div className="w-full flex justify-center p-10">
            <div className="w-full max-w-screen-md space-y-6">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 underline"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Chatbot
                </Link>
                <h1 className="text-3xl font-bold">MyAI3</h1>
                <h2 className="text-2xl font-semibold">Terms of Use / Disclaimer</h2>

                <p className="text-gray-700">
                    The following terms of use govern access to and use of the MyAI3
                    Assistant ("AI Chatbot"), an artificial intelligence tool provided by{" "}
                    {OWNER_NAME} ("I", "me", or "myself"). By engaging with the AI
                    Chatbot, you agree to these terms. If you do not agree, you may not
                    use the AI Chatbot.
                </p>

                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">General Information</h3>
                    <ol className="list-decimal list-inside space-y-3">

                        <li className="text-gray-700">
                            <span className="font-semibold">Provider and Purpose:</span> The
                            AI Chatbot is developed and maintained by {OWNER_NAME}. It is
                            designed to assist users by answering questions, helping with
                            planning, retrieving vendor information, and demonstrating the
                            capabilities of an AI-powered conversational assistant.
                            The AI Chatbot is not affiliated with or endorsed by any course
                            provider, organization, or institution unless explicitly stated.
                        </li>

                        <li className="text-gray-700">
                            <span className="font-semibold">Prototype and Demo Nature:</span>{" "}
                            This AI Chatbot is a prototype created for demonstration
                            purposes. Some vendor and service provider data displayed in the
                            chatbot may include placeholders or dummy information. Real vendor 
                            data is currently available only for <strong>caterers</strong>.
                            If accurate or verified information is required, users are
                            encouraged to search specifically for caterers.
                        </li>

                        <li className="text-gray-700">
                            <span className="font-semibold">Third-Party Involvement:</span>{" "}
                            The AI Chatbot utilizes multiple third-party platforms and
                            vendors, some operating outside the United States. Your
                            inputs may be transmitted, processed, and stored by these
                            systems. Privacy, confidentiality, and security cannot be
                            guaranteed.
                        </li>

                        <li className="text-gray-700">
                            <span className="font-semibold">No Guarantee of Accuracy:</span>{" "}
                            While designed to provide helpful and relevant responses, the AI
                            Chatbot may deliver inaccurate, incomplete, or outdated
                            information. Users should independently verify any information
                            before relying on it.
                        </li>
                    </ol>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Liability</h3>
                    <ol className="list-decimal list-inside space-y-3">

                        <li className="text-gray-700">
                            <span className="font-semibold">Use at Your Own Risk:</span> The
                            AI Chatbot is provided on an "as-is" and "as-available" basis as
                            a prototype. Some responses, vendor matches, or outputs may be
                            based on incomplete, outdated, or dummy data.
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-2">
                                <li>
                                    {OWNER_NAME} disclaims all warranties, express or implied,
                                    including but not limited to merchantability, fitness for
                                    a particular purpose, and non-infringement.
                                </li>
                                <li>
                                    {OWNER_NAME} is not liable for errors, inaccuracies, or
                                    omissions in the information provided by the AI Chatbot.
                                </li>
                            </ul>
                        </li>

                        <li className="text-gray-700">
                            <span className="font-semibold">
                                No Responsibility for Damages:
                            </span>{" "}
                            Under no circumstances shall {OWNER_NAME}, his collaborators,
                            partners, affiliated entities, or representatives be liable for
                            any direct, indirect, incidental, consequential, special, or
                            punitive damages arising from use of the AI Chatbot.
                        </li>

                        <li className="text-gray-700">
                            <span className="font-semibold">Modification or Discontinuation:</span>{" "}
                            I may modify, suspend, or discontinue the AI Chatbot at any time
                            without notice.
                        </li>

                        <li className="text-gray-700">
                            <span className="font-semibold">Future Fees:</span> While
                            currently free, a fee may be introduced in the future.
                        </li>
                    </ol>
                </div>

                {/* The rest of the sections unchanged */}

                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">User Responsibilities</h3>
                    <ol className="list-decimal list-inside space-y-3">
                        <li className="text-gray-700">
                            <span className="font-semibold">Eligibility:</span> Use of the AI
                            Chatbot is restricted to individuals aged 18 or older.
                        </li>

                        <li className="text-gray-700">
                            <span className="font-semibold">Prohibited Conduct:</span> By
                            using the AI Chatbot, you agree not to:
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-2">
                                <li>
                                    Post or transmit content that is defamatory, offensive,
                                    illegal, racist, discriminatory, or inappropriate.
                                </li>
                                <li>
                                    Use the AI Chatbot to engage in unlawful or unethical
                                    activities.
                                </li>
                                <li>
                                    Attempt to compromise the security or functionality of the
                                    AI Chatbot.
                                </li>
                                <li>
                                    Reverse engineer or copy the AI Chatbot without written consent.
                                </li>
                            </ul>
                        </li>
                    </ol>
                </div>

                {/* remaining sections unchanged */}

                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Data Privacy and Security</h3>
                    <ol className="list-decimal list-inside space-y-3">
                        <li className="text-gray-700">
                            <span className="font-semibold">No Privacy Guarantee:</span> The
                            AI Chatbot does not guarantee privacy or confidentiality.
                            Conversations may be reviewed by {OWNER_NAME}, collaborators, or
                            partners for improvement and research.
                        </li>
                        <li className="text-gray-700">
                            <span className="font-semibold">Public Information:</span> Any
                            information you provide may be treated as public.
                        </li>
                        <li className="text-gray-700">
                            <span className="font-semibold">Data Transmission:</span> Inputs
                            may be processed by third-party services.
                        </li>
                    </ol>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Ownership of Content and Commercial Use</h3>
                    <ol className="list-decimal list-inside space-y-3">
                        <li className="text-gray-700">
                            <span className="font-semibold">Surrender of Rights:</span> By
                            using the AI Chatbot, you assign all rights in content and inputs
                            to {OWNER_NAME}.
                        </li>
                        <li className="text-gray-700">
                            <span className="font-semibold">Commercial and Research Use:</span>{" "}
                            {OWNER_NAME} may use inputs/outputs for commercial or research
                            purposes without compensation.
                        </li>
                        <li className="text-gray-700">
                            <span className="font-semibold">No Claim to Gains:</span> Users have
                            no entitlement to profits generated from their content.
                        </li>
                    </ol>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Indemnification</h3>
                    <p className="text-gray-700">
                        You agree to indemnify and hold harmless {OWNER_NAME} and all
                        affiliated entities from any claims arising from your use of the AI
                        Chatbot.
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Governing Law and Jurisdiction</h3>
                    <p className="text-gray-700">
                        These terms are governed by the laws of the State of North Carolina,
                        United States. Disputes fall under the jurisdiction of North Carolina courts.
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Acceptance of Terms</h3>
                    <p className="text-gray-700">
                        By using the AI Chatbot, you confirm that you have read, understood,
                        and agreed to these Terms of Use. If you do not agree, do not use
                        the AI Chatbot.
                    </p>
                </div>

                <div className="mt-8 text-sm text-gray-600">
                    <p>Last Updated: November 27, 2025</p>
                </div>
            </div>
        </div>
    );
}
