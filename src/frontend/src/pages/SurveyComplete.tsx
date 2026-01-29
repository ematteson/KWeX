export function SurveyComplete() {
  return (
    <div className="min-h-screen bg-pearson-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Success icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-pearson-gray-900 mb-3">
          Thank You!
        </h1>

        <p className="text-pearson-gray-600 mb-6">
          Your survey response has been submitted successfully. Your feedback helps improve the work experience for your team.
        </p>

        <div className="bg-white rounded-lg border border-pearson-gray-200 p-4 mb-6">
          <h2 className="font-medium text-pearson-gray-800 mb-2">What happens next?</h2>
          <ul className="text-sm text-pearson-gray-600 text-left space-y-2">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-pearson-blue shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Your response is aggregated anonymously with your team</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-pearson-blue shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Results appear only after 7+ responses (privacy threshold)</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-pearson-blue shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Improvement opportunities are prioritized for your team</span>
            </li>
          </ul>
        </div>

        <p className="text-xs text-pearson-gray-500">
          This survey is for system diagnosis only — not performance management.
          <br />
          You can safely close this window.
        </p>
      </div>
    </div>
  )
}
