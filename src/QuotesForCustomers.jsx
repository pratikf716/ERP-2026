import { useState } from "react";

const QuotesForCustomers = () => {
  const [showForm, setShowForm] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [formData, setFormData] = useState({
    number: "",
    client: "",
    date: "",
    expiredDate: "",
    subTotal: "",
    total: "",
    status: "",
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setQuotes([...quotes, formData]);
    setShowForm(false);
    setFormData({ number: "", client: "", date: "", expiredDate: "", subTotal: "", total: "", status: "" });
  };

  return (
    <div className="container-fluid mt-3 px-3" style={{ marginLeft: "280px", maxWidth: "80vw" }}>
    <div className="d-flex justify-content-between align-items-center mb-2">
      <h5 className="fw-bold">Quotes For Customers</h5>
      <button className="btn btn-sm btn-primary" onClick={() => setShowForm(!showForm)}>
        + Add New Quote
      </button>
    </div>
  
    {showForm && (
      <form onSubmit={handleSubmit} className="card p-2 mb-2">
        <div className="row g-2">
          <div className="col-md-3">
            <label className="form-label">Number</label>
            <input type="text" className="form-control form-control-sm" name="number" value={formData.number} onChange={handleInputChange} required />
          </div>
          <div className="col-md-3">
            <label className="form-label">Client</label>
            <input type="text" className="form-control form-control-sm" name="client" value={formData.client} onChange={handleInputChange} required />
          </div>
          <div className="col-md-3">
            <label className="form-label">Date</label>
            <input type="date" className="form-control form-control-sm" name="date" value={formData.date} onChange={handleInputChange} required />
          </div>
          <div className="col-md-3">
            <label className="form-label">Expired Date</label>
            <input type="date" className="form-control form-control-sm" name="expiredDate" value={formData.expiredDate} onChange={handleInputChange} required />
          </div>
        </div>
        <div className="row g-2 mt-1">
          <div className="col-md-3">
            <label className="form-label">Sub Total</label>
            <input type="number" className="form-control form-control-sm" name="subTotal" value={formData.subTotal} onChange={handleInputChange} required />
          </div>
          <div className="col-md-3">
            <label className="form-label">Total</label>
            <input type="number" className="form-control form-control-sm" name="total" value={formData.total} onChange={handleInputChange} required />
          </div>
          <div className="col-md-3">
            <label className="form-label">Status</label>
            <select className="form-control form-control-sm" name="status" value={formData.status} onChange={handleInputChange} required>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button type="submit" className="btn btn-sm btn-success w-100">Save</button>
          </div>
        </div>
      </form>
    )}
  
    <table className="table table-sm table-striped">
      <thead>
        <tr>
          <th>#</th>
          <th>Client</th>
          <th>Date</th>
          <th>Expired</th>
          <th>Subtotal</th>
          <th>Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {quotes.length > 0 ? (
          quotes.map((quote, index) => (
            <tr key={index}>
              <td>{quote.number}</td>
              <td>{quote.client}</td>
              <td>{quote.date}</td>
              <td>{quote.expiredDate}</td>
              <td>{quote.subTotal}</td>
              <td>{quote.total}</td>
              <td>{quote.status}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="7" className="text-center">No data</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
  
  );
};

export default QuotesForCustomers;
