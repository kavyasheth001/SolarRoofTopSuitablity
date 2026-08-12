export default function Modal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center  pt-20  "
      onClick={onClose}
    >
      <div 
        className=" rounded min-w-[400px] "
        onClick={(e) => e.stopPropagation()}
      >
        {children}

        <button onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
