package config

var (
	Config *Type
)

type Type struct {
	Port        int    `json:"port"`
	Mode        string `json:"mode"`
	Mock        bool   `json:"mock"`
	ExternalURL string `json:"externalUrl"`
	Filepath    string `json:"filepath"`
	NodeName    string `json:"nodeName"` // If set, uses this instead of GenerateInstanceID()

	Redis struct {
		URL      string `json:"url"`
		Password string `json:"password,default=default"`
	}

	Auth struct {
		BootstrapPassword string
	}
}
