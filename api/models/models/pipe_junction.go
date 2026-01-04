package models

type PipeJunction struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Location `json:",inline" tstype:",extends"`
}

func (pj *PipeJunction) ToDTO() PipeJunctionDTO {
	return *pj
}
